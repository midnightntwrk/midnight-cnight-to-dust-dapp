import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockLog = vi.fn();
vi.mock('@/lib/logger', () => ({
  logger: { log: (...args: unknown[]) => mockLog(...args), error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const mockClientConstructor = vi.fn();
const mockRequest = vi.fn();
vi.mock('graphql-request', () => ({
  gql: (strings: TemplateStringsArray) => strings.join(''),
  GraphQLClient: class {
    constructor(...args: unknown[]) {
      mockClientConstructor(...args);
    }
    request = mockRequest;
  },
}));

import { Subgraph } from '../query';

describe('Subgraph', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should send the project token as a project_id header', () => {
    new Subgraph('https://midnight-mainnet.blockfrost.io/api/v0', 'mainnetSecret');
    expect(mockClientConstructor).toHaveBeenCalledWith('https://midnight-mainnet.blockfrost.io/api/v0', {
      cache: 'no-store',
      headers: { project_id: 'mainnetSecret' },
    });
  });

  it('should send no auth header when no token is given', () => {
    new Subgraph('http://localhost:8088/api/v4/graphql');
    expect(mockClientConstructor).toHaveBeenCalledWith('http://localhost:8088/api/v4/graphql', { cache: 'no-store' });
  });

  it('should never log the token', async () => {
    mockRequest.mockResolvedValueOnce({ dustGenerationStatus: [] });
    const subgraph = new Subgraph('https://midnight-mainnet.blockfrost.io/api/v0?project_id=urlSecret', 'headerSecret');
    await subgraph.getDustGenerationStatus(['stake1abc']);

    const logged = JSON.stringify(mockLog.mock.calls);
    expect(logged).not.toContain('urlSecret');
    expect(logged).not.toContain('headerSecret');
  });
});
