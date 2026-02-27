import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { UTxO } from '@lucid-evolution/lucid';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock Midnight SDK (must be before import of utils)
vi.mock('@midnight-ntwrk/wallet-sdk-address-format', () => ({
  MidnightBech32m: {
    parse: vi.fn(),
  },
  DustAddress: 'DustAddress',
}));

// Mock bech32m
vi.mock('bech32', () => ({
  bech32m: {
    decode: vi.fn(),
    fromWords: vi.fn(),
  },
}));

// Mock runtime config
vi.mock('@/config/runtime-config', () => ({
  getRuntimeConfig: vi.fn(() => ({
    CARDANO_NET: 'Preview',
  })),
}));

// Import after mocks are defined (vi.mock is hoisted)
import {
  formatNumber,
  toJson,
  splitTokenLucidKey,
  isTokenADA,
  getTotalOfUnitInUTxOList,
  validateDustAddress,
  getMidnightNetworkId,
} from '../utils';
import { MidnightBech32m } from '@midnight-ntwrk/wallet-sdk-address-format';
import { getRuntimeConfig } from '@/config/runtime-config';

describe('formatNumber', () => {
  it('should return raw number for values below 1000', () => {
    expect(formatNumber(0)).toBe('0.00');
    expect(formatNumber(500)).toBe('500.00');
    expect(formatNumber(999)).toBe('999.00');
  });

  it('should format with K suffix at 1000', () => {
    expect(formatNumber(1000)).toBe('1K');
  });

  it('should format with K suffix and one decimal', () => {
    expect(formatNumber(1500)).toBe('1.5K');
  });

  it('should strip trailing .0 for K suffix', () => {
    expect(formatNumber(2000)).toBe('2K');
  });

  it('should handle boundary at 999999', () => {
    expect(formatNumber(999999)).toBe('1000K');
  });

  it('should format with M suffix at 1000000', () => {
    expect(formatNumber(1000000)).toBe('1M');
  });

  it('should format with M suffix and one decimal', () => {
    expect(formatNumber(1500000)).toBe('1.5M');
  });

  it('should strip trailing .0 for M suffix', () => {
    expect(formatNumber(2000000)).toBe('2M');
  });

  it('should handle zero', () => {
    expect(formatNumber(0)).toBe('0.00');
  });

  it('should handle fractional values below 1000', () => {
    expect(formatNumber(42.5)).toBe('42.50');
  });
});

describe('toJson', () => {
  it('should serialize plain objects', () => {
    const result = JSON.parse(toJson({ a: 1, b: 'hello' }));
    expect(result).toEqual({ a: 1, b: 'hello' });
  });

  it('should serialize BigInt values with "n" suffix', () => {
    const result = toJson({ value: 123n });
    expect(result).toContain('"123n"');
  });

  it('should handle nested objects with BigInt', () => {
    const result = toJson({ outer: { inner: 456n } });
    const parsed = JSON.parse(result);
    expect(parsed.outer.inner).toBe('456n');
  });

  it('should pretty-print with 2-space indentation', () => {
    const result = toJson({ a: 1 });
    expect(result).toContain('\n');
    expect(result).toContain('  ');
  });
});

describe('splitTokenLucidKey', () => {
  it('should split a 56-char policy ID from the token name', () => {
    const policyId = 'a'.repeat(56);
    const tokenName = 'beef';
    const [cs, tn] = splitTokenLucidKey(policyId + tokenName);
    expect(cs).toBe(policyId);
    expect(tn).toBe(tokenName);
  });

  it('should return empty token name for 56-char key', () => {
    const policyId = 'b'.repeat(56);
    const [cs, tn] = splitTokenLucidKey(policyId);
    expect(cs).toBe(policyId);
    expect(tn).toBe('');
  });

  it('should handle strings shorter than 56 chars', () => {
    const [cs, tn] = splitTokenLucidKey('short');
    expect(cs).toBe('short');
    expect(tn).toBe('');
  });
});

describe('isTokenADA', () => {
  it('should return true for empty strings', () => {
    expect(isTokenADA('', '')).toBe(true);
  });

  it('should return true for "lovelace" with empty TN', () => {
    expect(isTokenADA('lovelace', '')).toBe(true);
  });

  it('should return false for non-ADA tokens', () => {
    expect(isTokenADA('somePolicyId', 'someTokenName')).toBe(false);
  });

  it('should return false when CS is empty but TN is not', () => {
    expect(isTokenADA('', 'someTokenName')).toBe(false);
  });

  it('should return false when CS is "lovelace" but TN is not empty', () => {
    expect(isTokenADA('lovelace', 'someTokenName')).toBe(false);
  });
});

describe('getTotalOfUnitInUTxOList', () => {
  const makeUtxo = (assets: Record<string, bigint>): UTxO =>
    ({
      txHash: 'abc123',
      outputIndex: 0,
      address: 'addr_test1...',
      assets,
    }) as unknown as UTxO;

  it('should calculate ADA totals with "lovelace"', () => {
    const utxos = [makeUtxo({ lovelace: 5_000_000n }), makeUtxo({ lovelace: 3_000_000n })];
    const total = getTotalOfUnitInUTxOList('lovelace', utxos);
    expect(total).toBe(8_000_000n);
  });

  it('should return 0n for empty UTxO list', () => {
    const total = getTotalOfUnitInUTxOList('lovelace', []);
    expect(total).toBe(0n);
  });

  it('should match full asset class (policy + token name)', () => {
    const policyId = 'd'.repeat(56);
    const tokenName = 'beef';
    const assetClass = policyId + tokenName;
    const utxos = [makeUtxo({ [assetClass]: 100n }), makeUtxo({ [assetClass]: 200n })];
    const total = getTotalOfUnitInUTxOList(assetClass, utxos, true);
    expect(total).toBe(300n);
  });

  it('should match by policy ID only when isFullAssetClass is false', () => {
    const policyId = 'e'.repeat(56);
    const asset1 = policyId + 'token1';
    const asset2 = policyId + 'token2';
    const utxos = [makeUtxo({ [asset1]: 10n, [asset2]: 20n })];
    const total = getTotalOfUnitInUTxOList(policyId, utxos, false);
    expect(total).toBe(30n);
  });

  it('should return 0n when asset is not found', () => {
    const policyId = 'f'.repeat(56);
    const utxos = [makeUtxo({ lovelace: 5_000_000n })];
    const total = getTotalOfUnitInUTxOList(policyId + 'missing', utxos, true);
    expect(total).toBe(0n);
  });

  it('should handle ADA with empty CS and TN', () => {
    const utxos = [makeUtxo({ lovelace: 1_000_000n })];
    const total = getTotalOfUnitInUTxOList('', utxos);
    expect(total).toBe(1_000_000n);
  });
});

describe('validateDustAddress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return false for empty string', () => {
    expect(validateDustAddress('', 'preview')).toBe(false);
  });

  it('should return false for whitespace-only string', () => {
    expect(validateDustAddress('   ', 'preview')).toBe(false);
  });

  it('should return true for a valid Dust address', () => {
    vi.mocked(MidnightBech32m.parse).mockReturnValue({
      decode: vi.fn().mockReturnValue({ serialize: vi.fn() }),
    } as never);
    expect(validateDustAddress('mn_dust_addr_test1valid', 'preview')).toBe(true);
  });

  it('should return false for an invalid Dust address', () => {
    vi.mocked(MidnightBech32m.parse).mockImplementation(() => {
      throw new Error('Invalid address');
    });
    expect(validateDustAddress('invalid_address', 'preview')).toBe(false);
  });

  it('should pass networkId to SDK decode', () => {
    const decodeMock = vi.fn().mockReturnValue({ serialize: vi.fn() });
    vi.mocked(MidnightBech32m.parse).mockReturnValue({ decode: decodeMock } as never);

    validateDustAddress('some_address', 'mainnet');
    expect(decodeMock).toHaveBeenCalledWith('DustAddress', 'mainnet');
  });
});

describe('getMidnightNetworkId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return "mainnet" for Mainnet', () => {
    vi.mocked(getRuntimeConfig).mockReturnValue({ CARDANO_NET: 'Mainnet' } as never);
    expect(getMidnightNetworkId()).toBe('mainnet');
  });

  it('should return "preview" for Preview', () => {
    vi.mocked(getRuntimeConfig).mockReturnValue({ CARDANO_NET: 'Preview' } as never);
    expect(getMidnightNetworkId()).toBe('preview');
  });

  it('should return "preprod" for Preprod', () => {
    vi.mocked(getRuntimeConfig).mockReturnValue({ CARDANO_NET: 'Preprod' } as never);
    expect(getMidnightNetworkId()).toBe('preprod');
  });
});
