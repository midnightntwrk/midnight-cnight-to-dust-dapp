import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: { log: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

// Mock runtime config
const mockGetIndexerEndpoint = vi.fn(() => 'https://indexer.preview.midnight.network/api/v3/graphql');
vi.mock('@/config/runtime-config', () => ({
  getIndexerEndpoint: () => mockGetIndexerEndpoint(),
}));

// Mock cors
const mockValidateOrigin = vi.fn((): string | null => 'http://localhost:3000');
const mockAddCorsHeaders = vi.fn();
const mockAddSecurityHeaders = vi.fn();
vi.mock('@/lib/cors', () => ({
  validateOrigin: (...args: unknown[]) => mockValidateOrigin(...args),
  addCorsHeaders: (...args: unknown[]) => mockAddCorsHeaders(...args),
  addSecurityHeaders: (...args: unknown[]) => mockAddSecurityHeaders(...args),
}));

// Mock rate-limit
const mockCheckRateLimit = vi.fn(() => ({ allowed: true, remaining: 99, resetTime: Date.now() + 60000 }));
const mockAddRateLimitHeaders = vi.fn();
const mockRateLimitExceededResponse = vi.fn();
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  addRateLimitHeaders: (...args: unknown[]) => mockAddRateLimitHeaders(...args),
  rateLimitExceededResponse: (...args: unknown[]) => mockRateLimitExceededResponse(...args),
}));

// Mock Subgraph
const mockGetDustGenerationStatus = vi.fn();
vi.mock('@/lib/subgraph/query', () => ({
  Subgraph: class {
    getDustGenerationStatus = mockGetDustGenerationStatus;
  },
}));

import { GET, OPTIONS, POST } from '../route';

function makeRequest(url = 'http://localhost:3000/api/dust/generation-status', method = 'GET') {
  return new NextRequest(new URL(url), {
    method,
    headers: { origin: 'http://localhost:3000' },
  });
}

describe('Generation Status API (/api/dust/generation-status)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateOrigin.mockReturnValue('http://localhost:3000');
    mockCheckRateLimit.mockReturnValue({ allowed: true, remaining: 99, resetTime: Date.now() + 60000 });
    mockGetIndexerEndpoint.mockReturnValue('https://indexer.preview.midnight.network/api/v3/graphql');
  });

  describe('GET', () => {
    it('should return 403 when origin is invalid', async () => {
      mockValidateOrigin.mockReturnValueOnce(null);
      const response = await GET(makeRequest());
      expect(response.status).toBe(403);
    });

    it('should return 429 when rate limited', async () => {
      mockCheckRateLimit.mockReturnValueOnce({ allowed: false, remaining: 0, resetTime: Date.now() + 60000 });
      const mockResponse = new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 });
      mockRateLimitExceededResponse.mockReturnValueOnce(mockResponse);

      const response = await GET(makeRequest());
      expect(response.status).toBe(429);
    });

    it('should return 500 when indexer endpoint is not configured', async () => {
      mockGetIndexerEndpoint.mockReturnValueOnce('');

      const response = await GET(makeRequest());
      const body = await response.json();
      expect(response.status).toBe(500);
      expect(body.error).toContain('not configured');
    });

    it('should return generation status data on success', async () => {
      mockGetDustGenerationStatus.mockResolvedValueOnce([
        {
          cardanoRewardAddress: 'stake_test1abc',
          dustAddress: 'mn_dust_test1xyz',
          registered: true,
          nightBalance: '1000',
          generationRate: '500',
          currentCapacity: '2000',
        },
      ]);

      const response = await GET(makeRequest());
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.data.generationStatus).toBeDefined();
    });

    it('should return 500 on subgraph error', async () => {
      mockGetDustGenerationStatus.mockRejectedValueOnce(new Error('Subgraph error'));

      const response = await GET(makeRequest());
      const body = await response.json();
      expect(response.status).toBe(500);
      expect(body.error).toContain('Failed to fetch');
    });

    it('should call addCorsHeaders with valid origin', async () => {
      mockGetDustGenerationStatus.mockResolvedValueOnce([]);

      await GET(makeRequest());
      expect(mockAddCorsHeaders).toHaveBeenCalled();
    });
  });

  describe('OPTIONS', () => {
    it('should return 204 for valid origin', async () => {
      const response = await OPTIONS(makeRequest());
      expect(response.status).toBe(204);
    });

    it('should return 204 for invalid origin (preflight is permissive)', async () => {
      mockValidateOrigin.mockReturnValueOnce(null);
      const response = await OPTIONS(makeRequest());
      expect(response.status).toBe(204);
    });
  });

  describe('POST', () => {
    it('should return 405 method not allowed', async () => {
      const response = await POST(makeRequest('http://localhost:3000/api/dust/generation-status', 'POST'));
      const body = await response.json();
      expect(response.status).toBe(405);
      expect(body.error).toContain('Method not allowed');
    });
  });
});
