import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '../route';

// Mock the runtime config module
vi.mock('@/config/runtime-config', () => ({
  getServerRuntimeConfig: vi.fn(() => ({
    CARDANO_NET: 'Preview',
    BLOCKFROST_URL_PREVIEW: 'https://cardano-preview.blockfrost.io/api/v0',
    BLOCKFROST_URL_PREPROD: 'https://cardano-preprod.blockfrost.io/api/v0',
    BLOCKFROST_URL_MAINNET: 'https://cardano-mainnet.blockfrost.io/api/v0',
  })),
}));

// Mock the contractUtils to avoid WASM loading issues
vi.mock('@/lib/contractUtils', () => ({
  NETWORKS: {
    MAINNET: 'Mainnet',
    PREPROD: 'Preprod',
    PREVIEW: 'Preview',
  },
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

// Store original env
const originalEnv = { ...process.env };

describe('Readiness Check Endpoint (/api/health/ready)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-02T12:00:00.000Z'));
    vi.stubGlobal('fetch', vi.fn());
    // Set test API key
    process.env.BLOCKFROST_KEY_PREVIEW = 'test-api-key';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    // Restore env
    process.env = { ...originalEnv };
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
    // Restore env
    process.env = { ...originalEnv };
  });

  it('should return error when BLOCKFROST_URL is not configured', async () => {
    vi.doMock('@/config/runtime-config', () => ({
      getServerRuntimeConfig: vi.fn(() => ({
        CARDANO_NET: 'Preview',
        BLOCKFROST_URL_PREVIEW: undefined,
        BLOCKFROST_URL_PREPROD: undefined,
        BLOCKFROST_URL_MAINNET: undefined,
      })),
    }));

    vi.doMock('@/lib/contractUtils', () => ({
      NETWORKS: {
        MAINNET: 'Mainnet',
        PREPROD: 'Preprod',
        PREVIEW: 'Preview',
      },
    }));

    process.env.BLOCKFROST_KEY_PREVIEW = 'test-key';

    const { GET: getHandler } = await import('../route');
    const response = await getHandler();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.dependencies.blockfrost.status).toBe('error');
    expect(body.dependencies.blockfrost.error).toBe('Blockfrost not configured');
  });

  it('should return error when BLOCKFROST_KEY is not configured', async () => {
    vi.doMock('@/config/runtime-config', () => ({
      getServerRuntimeConfig: vi.fn(() => ({
        CARDANO_NET: 'Preview',
        BLOCKFROST_URL_PREVIEW: 'https://cardano-preview.blockfrost.io/api/v0',
        BLOCKFROST_URL_PREPROD: 'https://cardano-preprod.blockfrost.io/api/v0',
        BLOCKFROST_URL_MAINNET: 'https://cardano-mainnet.blockfrost.io/api/v0',
      })),
    }));

    vi.doMock('@/lib/contractUtils', () => ({
      NETWORKS: {
        MAINNET: 'Mainnet',
        PREPROD: 'Preprod',
        PREVIEW: 'Preview',
      },
    }));

    // Ensure no API key is set
    delete process.env.BLOCKFROST_KEY_PREVIEW;
    delete process.env.BLOCKFROST_KEY_PREPROD;
    delete process.env.BLOCKFROST_KEY_MAINNET;

    const { GET: getHandler } = await import('../route');
    const response = await getHandler();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.dependencies.blockfrost.status).toBe('error');
    expect(body.dependencies.blockfrost.error).toBe('Blockfrost not configured');
  });
});
