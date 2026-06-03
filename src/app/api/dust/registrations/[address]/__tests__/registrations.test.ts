import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: { log: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
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

// Mock registration cache
const mockEnsureFresh = vi.fn(() => Promise.resolve());
const mockGetRegistrationsForStakeKey = vi.fn(() => []);
const mockIsReady = vi.fn(() => true);
const mockGetCacheStats = vi.fn(() => ({ total: 0, lastRefresh: 0 }));
const mockDebugStakeKeySample = vi.fn(() => []);
vi.mock('@/lib/registration-cache', () => ({
  _ensureFresh: () => mockEnsureFresh(),
  getRegistrationsForStakeKey: (...args: unknown[]) => mockGetRegistrationsForStakeKey(...args),
  isReady: () => mockIsReady(),
  getCacheStats: () => mockGetCacheStats(),
  _debugStakeKeySample: (...args: unknown[]) => mockDebugStakeKeySample(...args),
}));

import { GET, OPTIONS } from '../route';

// A real bech32-encoded Cardano testnet base address (type 0, 57 bytes decoded)
const VALID_ADDRESS =
  'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp';
// Enterprise address (type 6, no stake key)
const ENTERPRISE_ADDRESS = 'addr_test1vz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzerspjrlsz';

function makeRequest(url = `http://localhost:3000/api/dust/registrations/${VALID_ADDRESS}`, method = 'GET') {
  return new NextRequest(new URL(url), {
    method,
    headers: { origin: 'http://localhost:3000' },
  });
}

function makeParams(address = VALID_ADDRESS) {
  return { params: Promise.resolve({ address }) };
}

describe('Registrations API (/api/dust/registrations/[address])', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateOrigin.mockReturnValue('http://localhost:3000');
    mockCheckRateLimit.mockReturnValue({ allowed: true, remaining: 99, resetTime: Date.now() + 60000 });
    mockIsReady.mockReturnValue(true);
  });

  describe('GET', () => {
    it('should return 403 when origin is invalid', async () => {
      mockValidateOrigin.mockReturnValueOnce(null);
      const response = await GET(makeRequest(), makeParams());
      expect(response.status).toBe(403);
    });

    it('should return 429 when rate limited', async () => {
      mockCheckRateLimit.mockReturnValueOnce({ allowed: false, remaining: 0, resetTime: Date.now() + 60000 });
      const mockResponse = new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 });
      mockRateLimitExceededResponse.mockReturnValueOnce(mockResponse);

      const response = await GET(makeRequest(), makeParams());
      expect(response.status).toBe(429);
    });

    it('should return 503 when cache is not ready', async () => {
      mockIsReady.mockReturnValueOnce(false);

      const response = await GET(makeRequest(), makeParams());
      const body = await response.json();
      expect(response.status).toBe(503);
      expect(body.error).toContain('initializing');
      expect(response.headers.get('Retry-After')).toBe('10');
    });

    it('should return 400 when stake key cannot be extracted', async () => {
      const response = await GET(makeRequest(), makeParams(ENTERPRISE_ADDRESS));
      const body = await response.json();
      expect(response.status).toBe(400);
      expect(body.error).toContain('stake key');
    });

    it('should call _ensureFresh before serving registrations', async () => {
      await GET(makeRequest(), makeParams());
      expect(mockEnsureFresh).toHaveBeenCalled();
    });

    it('should return registrations on success', async () => {
      const registrations = [
        {
          txHash: 'tx1',
          outputIndex: 0,
          stakeKeyHash: '32c728d3861e164cab28cb8f006448139c8f1740ffb8e7aa9e5232dc',
          dustPKH: 'dustpkh1',
          inlineDatum: 'd8799f...',
          amount: [{ unit: 'lovelace', quantity: '2000000' }],
        },
      ];
      mockGetRegistrationsForStakeKey.mockReturnValueOnce(registrations);

      const response = await GET(makeRequest(), makeParams());
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(registrations);
    });

    it('should return empty array when no registrations found', async () => {
      mockGetRegistrationsForStakeKey.mockReturnValueOnce([]);

      const response = await GET(makeRequest(), makeParams());
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toEqual([]);
    });

    it('should return 400 for invalid bech32 address', async () => {
      const response = await GET(makeRequest(), makeParams('not_a_valid_address'));
      const body = await response.json();
      expect(response.status).toBe(400);
      expect(body.error).toContain('Failed to parse address');
    });

    it('should call addCorsHeaders with valid origin', async () => {
      await GET(makeRequest(), makeParams());
      expect(mockAddCorsHeaders).toHaveBeenCalled();
    });

    it('should call addSecurityHeaders', async () => {
      await GET(makeRequest(), makeParams());
      expect(mockAddSecurityHeaders).toHaveBeenCalled();
    });
  });

  describe('OPTIONS', () => {
    it('should return 204 for valid origin', async () => {
      const response = await OPTIONS(makeRequest());
      expect(response.status).toBe(204);
    });

    it('should return 403 for invalid origin', async () => {
      mockValidateOrigin.mockReturnValueOnce(null);
      const response = await OPTIONS(makeRequest());
      expect(response.status).toBe(403);
    });
  });
});
