import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '../route';

// Mock the network config module
vi.mock('@/config/network', () => ({
  BLOCKFROST_URL: 'https://cardano-preview.blockfrost.io/api/v0',
  BLOCKFROST_KEY: 'test-api-key',
}));

// Mock the logger to avoid console noise in tests
vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
  },
}));

describe('Readiness Check Endpoint (/api/health/ready)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-02T12:00:00.000Z'));
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe('when Blockfrost is healthy', () => {
    beforeEach(() => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ url: 'https://blockfrost.io/', version: '0.1.0' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should return 200 status', async () => {
      const response = await GET();

      expect(response.status).toBe(200);
    });

    it('should return status "ok"', async () => {
      const response = await GET();
      const body = await response.json();

      expect(body.status).toBe('ok');
    });

    it('should include timestamp in response', async () => {
      const response = await GET();
      const body = await response.json();

      expect(body.timestamp).toBe('2026-01-02T12:00:00.000Z');
    });

    it('should show Blockfrost dependency as ok', async () => {
      const response = await GET();
      const body = await response.json();

      expect(body.dependencies.blockfrost.status).toBe('ok');
    });

    it('should include latency for Blockfrost check', async () => {
      const response = await GET();
      const body = await response.json();

      expect(body.dependencies.blockfrost.latencyMs).toBeDefined();
      expect(typeof body.dependencies.blockfrost.latencyMs).toBe('number');
    });
  });

  describe('when Blockfrost is unhealthy', () => {
    beforeEach(() => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ error: 'Service Unavailable' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should return 503 status', async () => {
      const response = await GET();

      expect(response.status).toBe(503);
    });

    it('should return status "degraded"', async () => {
      const response = await GET();
      const body = await response.json();

      expect(body.status).toBe('degraded');
    });

    it('should show Blockfrost dependency as error', async () => {
      const response = await GET();
      const body = await response.json();

      expect(body.dependencies.blockfrost.status).toBe('error');
    });

    it('should include error message for failed dependency', async () => {
      const response = await GET();
      const body = await response.json();

      expect(body.dependencies.blockfrost.error).toBe('HTTP 503');
    });
  });

  describe('when Blockfrost request times out', () => {
    beforeEach(() => {
      vi.mocked(fetch).mockRejectedValue(new Error('The operation was aborted due to timeout'));
    });

    it('should return 503 status', async () => {
      const response = await GET();

      expect(response.status).toBe(503);
    });

    it('should return status "degraded"', async () => {
      const response = await GET();
      const body = await response.json();

      expect(body.status).toBe('degraded');
    });

    it('should include timeout error message', async () => {
      const response = await GET();
      const body = await response.json();

      expect(body.dependencies.blockfrost.error).toBe('The operation was aborted due to timeout');
    });
  });

  describe('when Blockfrost request fails with network error', () => {
    beforeEach(() => {
      vi.mocked(fetch).mockRejectedValue(new Error('fetch failed'));
    });

    it('should return 503 status', async () => {
      const response = await GET();

      expect(response.status).toBe(503);
    });

    it('should include network error message', async () => {
      const response = await GET();
      const body = await response.json();

      expect(body.dependencies.blockfrost.error).toBe('fetch failed');
    });
  });

  describe('Blockfrost request configuration', () => {
    beforeEach(() => {
      vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
    });

    it('should call Blockfrost with correct URL', async () => {
      await GET();

      expect(fetch).toHaveBeenCalledWith('https://cardano-preview.blockfrost.io/api/v0', expect.any(Object));
    });

    it('should include project_id header', async () => {
      await GET();

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            project_id: 'test-api-key',
          }),
        })
      );
    });

    it('should use GET method', async () => {
      await GET();

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'GET',
        })
      );
    });
  });
});

describe('Readiness Check with missing configuration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-02T12:00:00.000Z'));
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should return error when BLOCKFROST_URL is not configured', async () => {
    vi.doMock('@/config/network', () => ({
      BLOCKFROST_URL: undefined,
      BLOCKFROST_KEY: 'test-key',
    }));

    const { GET: getHandler } = await import('../route');
    const response = await getHandler();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.dependencies.blockfrost.status).toBe('error');
    expect(body.dependencies.blockfrost.error).toBe('Blockfrost not configured');
  });

  it('should return error when BLOCKFROST_KEY is not configured', async () => {
    vi.doMock('@/config/network', () => ({
      BLOCKFROST_URL: 'https://cardano-preview.blockfrost.io/api/v0',
      BLOCKFROST_KEY: undefined,
    }));

    const { GET: getHandler } = await import('../route');
    const response = await getHandler();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.dependencies.blockfrost.status).toBe('error');
    expect(body.dependencies.blockfrost.error).toBe('Blockfrost not configured');
  });
});
