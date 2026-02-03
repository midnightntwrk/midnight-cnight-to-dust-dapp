import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the runtime-config module
vi.mock('@/config/runtime-config', () => ({
  getRuntimeConfig: vi.fn(() => ({
    CARDANO_NET: 'Preview',
  })),
}));

// Mock the logger to avoid console noise
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock the Midnight SDK - these are complex WASM-based modules
vi.mock('@midnight-ntwrk/wallet-sdk-address-format', () => ({
  MidnightBech32m: {
    parse: vi.fn(),
  },
  DustAddress: {},
}));

describe('utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('toJson', () => {
    it('should convert object to JSON string', async () => {
      const { toJson } = await import('../utils');

      const result = toJson({ foo: 'bar', num: 123 });

      expect(result).toBe(JSON.stringify({ foo: 'bar', num: 123 }, null, 2));
    });

    it('should handle bigint values by converting to string with n suffix', async () => {
      const { toJson } = await import('../utils');

      const result = toJson({ amount: BigInt(1000000) });

      expect(result).toContain('"amount": "1000000n"');
    });

    it('should handle nested objects', async () => {
      const { toJson } = await import('../utils');

      const result = toJson({ outer: { inner: 'value' } });
      const parsed = JSON.parse(result);

      expect(parsed.outer.inner).toBe('value');
    });
  });

  describe('splitTokenLucidKey', () => {
    it('should split a 56+ character key into CS and TN_Hex', async () => {
      const { splitTokenLucidKey } = await import('../utils');

      const policyId = 'd2dbff622e509dda256fedbd31ef6e9fd98ed49ad91d5c0e07f68af1';
      const tokenName = '746f6b656e';
      const key = policyId + tokenName;

      const [cs, tn] = splitTokenLucidKey(key);

      expect(cs).toBe(policyId);
      expect(tn).toBe(tokenName);
    });

    it('should handle key with no token name', async () => {
      const { splitTokenLucidKey } = await import('../utils');

      const policyId = 'd2dbff622e509dda256fedbd31ef6e9fd98ed49ad91d5c0e07f68af1';

      const [cs, tn] = splitTokenLucidKey(policyId);

      expect(cs).toBe(policyId);
      expect(tn).toBe('');
    });
  });

  describe('isTokenADA', () => {
    it('should return true for empty CS and TN', async () => {
      const { isTokenADA } = await import('../utils');

      expect(isTokenADA('', '')).toBe(true);
    });

    it('should return true for lovelace CS and empty TN', async () => {
      const { isTokenADA } = await import('../utils');

      expect(isTokenADA('lovelace', '')).toBe(true);
    });

    it('should return false for non-ADA token', async () => {
      const { isTokenADA } = await import('../utils');

      expect(isTokenADA('d2dbff622e509dda256fedbd31ef6e9fd98ed49ad91d5c0e07f68af1', '')).toBe(false);
    });

    it('should return false when TN is not empty', async () => {
      const { isTokenADA } = await import('../utils');

      expect(isTokenADA('', 'token')).toBe(false);
    });
  });

  describe('formatNumber', () => {
    it('should format millions with M suffix', async () => {
      const { formatNumber } = await import('../utils');

      expect(formatNumber(1000000)).toBe('1M');
      expect(formatNumber(1500000)).toBe('1.5M');
      expect(formatNumber(2300000)).toBe('2.3M');
    });

    it('should format thousands with K suffix', async () => {
      const { formatNumber } = await import('../utils');

      expect(formatNumber(1000)).toBe('1K');
      expect(formatNumber(1500)).toBe('1.5K');
      expect(formatNumber(999000)).toBe('999K');
    });

    it('should format small numbers with 2 decimal places', async () => {
      const { formatNumber } = await import('../utils');

      expect(formatNumber(100)).toBe('100.00');
      expect(formatNumber(999.99)).toBe('999.99');
      expect(formatNumber(0.12)).toBe('0.12');
    });

    it('should remove trailing .0 from M and K suffixes', async () => {
      const { formatNumber } = await import('../utils');

      expect(formatNumber(2000000)).toBe('2M');
      expect(formatNumber(5000)).toBe('5K');
    });
  });

  describe('getTotalOfUnitInUTxOList', () => {
    it('should calculate total lovelace across UTxOs', async () => {
      const { getTotalOfUnitInUTxOList } = await import('../utils');

      const utxos = [
        { assets: { lovelace: 1000000n } },
        { assets: { lovelace: 2000000n } },
        { assets: { lovelace: 500000n } },
      ] as any;

      const total = getTotalOfUnitInUTxOList('lovelace', utxos);

      expect(total).toBe(3500000n);
    });

    it('should calculate total for specific token', async () => {
      const { getTotalOfUnitInUTxOList } = await import('../utils');

      const policyId = 'd2dbff622e509dda256fedbd31ef6e9fd98ed49ad91d5c0e07f68af1';
      const tokenName = '746f6b656e';
      const assetClass = policyId + tokenName;

      const utxos = [
        { assets: { [assetClass]: 100n, lovelace: 1000000n } },
        { assets: { [assetClass]: 200n, lovelace: 2000000n } },
      ] as any;

      const total = getTotalOfUnitInUTxOList(assetClass, utxos);

      expect(total).toBe(300n);
    });

    it('should sum all tokens with same policy ID when isFullAssetClass is false', async () => {
      const { getTotalOfUnitInUTxOList } = await import('../utils');

      const policyId = 'd2dbff622e509dda256fedbd31ef6e9fd98ed49ad91d5c0e07f68af1';
      const token1 = policyId + 'token1hex';
      const token2 = policyId + 'token2hex';

      const utxos = [
        { assets: { [token1]: 100n, [token2]: 50n } },
        { assets: { [token1]: 200n } },
      ] as any;

      const total = getTotalOfUnitInUTxOList(policyId, utxos, false);

      expect(total).toBe(350n);
    });

    it('should return 0n for empty UTxO list', async () => {
      const { getTotalOfUnitInUTxOList } = await import('../utils');

      const total = getTotalOfUnitInUTxOList('lovelace', []);

      expect(total).toBe(0n);
    });

    it('should handle missing assets gracefully', async () => {
      const { getTotalOfUnitInUTxOList } = await import('../utils');

      const utxos = [
        { assets: { lovelace: 1000000n } },
        { assets: {} },
      ] as any;

      const total = getTotalOfUnitInUTxOList('lovelace', utxos);

      expect(total).toBe(1000000n);
    });
  });

  describe('getMidnightNetworkId', () => {
    it('should return "preview" for non-Mainnet networks', async () => {
      const { getRuntimeConfig } = await import('@/config/runtime-config');
      vi.mocked(getRuntimeConfig).mockReturnValue({
        CARDANO_NET: 'Preview',
      } as any);

      const { getMidnightNetworkId } = await import('../utils');

      expect(getMidnightNetworkId()).toBe('preview');
    });

    it('should return "mainnet" for Mainnet network', async () => {
      vi.resetModules();

      vi.doMock('@/config/runtime-config', () => ({
        getRuntimeConfig: vi.fn(() => ({
          CARDANO_NET: 'Mainnet',
        })),
      }));

      const { getMidnightNetworkId } = await import('../utils');

      expect(getMidnightNetworkId()).toBe('mainnet');
    });
  });
});
