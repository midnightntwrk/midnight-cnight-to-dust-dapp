import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/logger', () => ({
  logger: { log: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const mockGetIndexerEndpoint = vi.fn(() => 'https://midnight-mainnet.blockfrost.io/api/v0');
const mockGetIndexerProjectId = vi.fn(() => 'mainnetSecret');
vi.mock('@/config/indexer', () => ({
  getIndexerEndpoint: () => mockGetIndexerEndpoint(),
  getIndexerProjectId: () => mockGetIndexerProjectId(),
}));

const mockValidateOrigin = vi.fn((): string | null => 'http://localhost:3000');
vi.mock('@/lib/cors', () => ({
  validateOrigin: () => mockValidateOrigin(),
  addCorsHeaders: vi.fn(),
  addSecurityHeaders: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, remaining: 99, resetTime: Date.now() + 60000 })),
  addRateLimitHeaders: vi.fn(),
  rateLimitExceededResponse: vi.fn(),
}));

const mockGetDustGenerationStatus = vi.fn();
const mockSubgraphConstructor = vi.fn();
vi.mock('@/lib/subgraph/query', () => ({
  Subgraph: class {
    constructor(...args: unknown[]) {
      mockSubgraphConstructor(...args);
    }
    getDustGenerationStatus = mockGetDustGenerationStatus;
  },
}));

import { GET } from '../route';

const REWARD_ADDRESS = `stake_test1${'u'.repeat(53)}`;

function call(key: string) {
  // Same-origin browser GETs carry no Origin header
  const request = new NextRequest(new URL(`http://localhost:3000/api/dust/generation-status/${key}`));
  return GET(request, { params: Promise.resolve({ key }) });
}

describe('Generation Status by key API (/api/dust/generation-status/[key])', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateOrigin.mockReturnValue('http://localhost:3000');
    mockGetIndexerEndpoint.mockReturnValue('https://midnight-mainnet.blockfrost.io/api/v0');
    mockGetIndexerProjectId.mockReturnValue('mainnetSecret');
  });

  it('should return { success, data } for a registered address', async () => {
    const status = {
      cardanoRewardAddress: REWARD_ADDRESS,
      dustAddress: 'mn_dust_test1xyz',
      registered: true,
      nightBalance: '1000',
      generationRate: '500',
      currentCapacity: '2000',
    };
    mockGetDustGenerationStatus.mockResolvedValueOnce([status]);

    const response = await call(REWARD_ADDRESS);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, data: [status] });
    expect(mockGetDustGenerationStatus).toHaveBeenCalledWith([REWARD_ADDRESS]);
  });

  it('should query the indexer with the project token server-side and never return it', async () => {
    mockGetDustGenerationStatus.mockResolvedValueOnce([{ cardanoRewardAddress: REWARD_ADDRESS }]);

    const response = await call(REWARD_ADDRESS);
    expect(mockSubgraphConstructor).toHaveBeenCalledWith('https://midnight-mainnet.blockfrost.io/api/v0', 'mainnetSecret');
    expect(await response.text()).not.toContain('mainnetSecret');
  });

  it('should return 404 when the address is not found', async () => {
    mockGetDustGenerationStatus.mockResolvedValueOnce([]);
    const response = await call(REWARD_ADDRESS);
    expect(response.status).toBe(404);
  });

  it('should return 400 for a malformed reward address without querying the indexer', async () => {
    const response = await call('not-a-stake-address');
    expect(response.status).toBe(400);
    expect(mockGetDustGenerationStatus).not.toHaveBeenCalled();
  });

  it('should return 403 for a disallowed cross-origin request', async () => {
    mockValidateOrigin.mockReturnValueOnce(null);
    const response = await call(REWARD_ADDRESS);
    expect(response.status).toBe(403);
  });

  it('should return a generic 500 on indexer error', async () => {
    mockGetDustGenerationStatus.mockRejectedValueOnce(new Error('403 Forbidden: Invalid project token'));
    const response = await call(REWARD_ADDRESS);
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain('project token');
  });
});
