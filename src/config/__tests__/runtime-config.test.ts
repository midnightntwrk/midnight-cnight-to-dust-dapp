import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Store original env
const originalEnv = { ...process.env };

// Mock window to test client-side behavior
const originalWindow = global.window;

describe('runtime-config', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    global.window = originalWindow;
  });

  describe('getServerRuntimeConfig', () => {
    it('should return default config when no env vars are set', async () => {
      const { getServerRuntimeConfig } = await import('../runtime-config');
      const config = getServerRuntimeConfig();

      expect(config.CARDANO_NET).toBe('Preview');
      expect(config.BLOCKFROST_URL_PREVIEW).toBe('https://cardano-preview.blockfrost.io/api/v0');
      expect(config.BLOCKFROST_URL_PREPROD).toBe('https://cardano-preprod.blockfrost.io/api/v0');
      expect(config.BLOCKFROST_URL_MAINNET).toBe('https://cardano-mainnet.blockfrost.io/api/v0');
      expect(config.SIMULATION_MODE).toBe('false');
    });

    it('should return env vars when set', async () => {
      process.env.NEXT_PUBLIC_CARDANO_NET = 'Mainnet';
      process.env.NEXT_PUBLIC_SIMULATION_MODE = 'true';
      process.env.NEXT_PUBLIC_INDEXER_ENDPOINT = 'https://custom-indexer.com/graphql';

      const { getServerRuntimeConfig } = await import('../runtime-config');
      const config = getServerRuntimeConfig();

      expect(config.CARDANO_NET).toBe('Mainnet');
      expect(config.SIMULATION_MODE).toBe('true');
      expect(config.INDEXER_ENDPOINT).toBe('https://custom-indexer.com/graphql');
    });

    it('should handle Preprod network', async () => {
      process.env.NEXT_PUBLIC_CARDANO_NET = 'Preprod';

      const { getServerRuntimeConfig } = await import('../runtime-config');
      const config = getServerRuntimeConfig();

      expect(config.CARDANO_NET).toBe('Preprod');
    });

    it('should use nullish coalescing for encoded names (allowing empty strings)', async () => {
      process.env.NEXT_PUBLIC_PREVIEW_CNIGHT_CURRENCY_ENCODEDNAME = '';
      process.env.NEXT_PUBLIC_PREPROD_CNIGHT_CURRENCY_ENCODEDNAME = 'test-name';

      const { getServerRuntimeConfig } = await import('../runtime-config');
      const config = getServerRuntimeConfig();

      // Empty string should be preserved (not fall back to default)
      expect(config.PREVIEW_CNIGHT_CURRENCY_ENCODEDNAME).toBe('');
      expect(config.PREPROD_CNIGHT_CURRENCY_ENCODEDNAME).toBe('test-name');
    });
  });

  describe('getRuntimeConfig', () => {
    it('should return server config when window is undefined (server-side)', async () => {
      // @ts-expect-error - intentionally setting window to undefined
      delete global.window;

      process.env.NEXT_PUBLIC_CARDANO_NET = 'Preprod';

      const { getRuntimeConfig } = await import('../runtime-config');
      const config = getRuntimeConfig();

      expect(config.CARDANO_NET).toBe('Preprod');
    });

    it('should return default config on client-side when cache is empty', async () => {
      // @ts-expect-error - simulating browser environment
      global.window = {};

      const { getRuntimeConfig, defaultConfig } = await import('../runtime-config');
      const config = getRuntimeConfig();

      expect(config).toEqual(defaultConfig);
    });
  });

  describe('isRuntimeConfigLoaded', () => {
    it('should return true on server-side', async () => {
      // @ts-expect-error - intentionally setting window to undefined
      delete global.window;

      const { isRuntimeConfigLoaded } = await import('../runtime-config');

      expect(isRuntimeConfigLoaded()).toBe(true);
    });

    it('should return false on client-side when cache is empty', async () => {
      // @ts-expect-error - simulating browser environment
      global.window = {};

      const { isRuntimeConfigLoaded } = await import('../runtime-config');

      expect(isRuntimeConfigLoaded()).toBe(false);
    });
  });

  describe('defaultConfig', () => {
    it('should export default configuration values', async () => {
      const { defaultConfig } = await import('../runtime-config');

      expect(defaultConfig.CARDANO_NET).toBe('Preview');
      expect(defaultConfig.BLOCKFROST_URL_PREVIEW).toBe('https://cardano-preview.blockfrost.io/api/v0');
      expect(defaultConfig.BLOCKCHAIN_EXPLORER_URL_PREVIEW).toBe('https://preview.cexplorer.io');
      expect(defaultConfig.PREVIEW_CNIGHT_CURRENCY_POLICY_ID).toBe('d2dbff622e509dda256fedbd31ef6e9fd98ed49ad91d5c0e07f68af1');
    });
  });

  describe('CardanoNetwork type', () => {
    it('should accept valid network values', async () => {
      const validNetworks = ['Mainnet', 'Preview', 'Preprod'];

      for (const network of validNetworks) {
        process.env.NEXT_PUBLIC_CARDANO_NET = network;
        vi.resetModules();

        const { getServerRuntimeConfig } = await import('../runtime-config');
        const config = getServerRuntimeConfig();

        expect(config.CARDANO_NET).toBe(network);
      }
    });
  });
});
