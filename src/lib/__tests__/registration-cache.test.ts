import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('@/lib/logger', () => ({
  logger: { log: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/config/runtime-config', () => ({
  getServerRuntimeConfig: () => ({
    CARDANO_NET: 'Preview',
    BLOCKFROST_URL_PREVIEW: 'https://cardano-preview.blockfrost.io/api/v0',
  }),
}));

vi.mock('@/config/contract_blueprint', () => ({
  CnightGeneratesDustCnightGeneratesDustElse: class {
    Script = { hash: () => 'abc123policyid' };
  },
}));

vi.mock('@/lib/contractUtils', async () => {
  const { Data, Constr } = await import('@lucid-evolution/lucid');

  function parseDustMappingDatum(inlineDatum: string): { stakeKeyHash: string; dustPKH: string } | null {
    try {
      const datum = Data.from(inlineDatum);
      if (!(datum instanceof Constr) || datum.index !== 0 || datum.fields.length !== 2) return null;
      const [inner, dustPKH] = datum.fields as [Constr<string>, string];
      if (!(inner instanceof Constr) || inner.index !== 0 || inner.fields.length !== 1) return null;
      const stakeKeyHash = inner.fields[0] as string;
      if (!stakeKeyHash || !dustPKH) return null;
      return { stakeKeyHash, dustPKH };
    } catch {
      return null;
    }
  }

  return {
    getValidatorAddress: () => 'addr_test1validator',
    getPolicyId: () => 'abc123policyid',
    NETWORKS: { MAINNET: 'Mainnet', PREPROD: 'Preprod', PREVIEW: 'Preview' },
    dustGeneratorDetails: {
      validatorAddress: 'addr_test1validator',
      policyId: 'abc123policyid',
      assetName: 'abc123policyid',
    },
    parseDustMappingDatum,
  };
});

import {
  getRegistrationsForStakeKey,
  isReady,
  getCacheStats,
  _resetForTesting,
  _ensureFresh,
} from '../registration-cache';

// ── Helpers ────────────────────────────────────────────────────────────────────

const MAX_WARM_PAGES_COUNT = 50;

// Build a real CBOR-encoded Plutus datum: Constr(0, [Constr(0, [stakeKeyHash]), dustPKH])
// CBOR tag 121 = Constr index 0, tag 122 = Constr index 1
function buildDatumHex(stakeKeyHash: string, dustPKH: string, outerTag = 'd879', innerTag = 'd879'): string {
  const skh = stakeKeyHash.padEnd(56, '0').slice(0, 56); // 28 bytes = 56 hex chars
  const dpkh = dustPKH.padEnd(56, '0').slice(0, 56);
  return `${outerTag}9f${innerTag}9f581c${skh}ff581c${dpkh}ff`;
}

function makeBlockfrostUtxo(
  tx_hash: string,
  output_index: number,
  stakeKeyHash: string,
  dustPKH: string,
  inline_datum?: string
) {
  return {
    tx_hash,
    output_index,
    amount: [
      { unit: 'lovelace', quantity: '2000000' },
      { unit: 'abc123policyid', quantity: '1' },
    ],
    inline_datum: inline_datum ?? buildDatumHex(stakeKeyHash, dustPKH),
    address: 'addr_test1validator',
  };
}

function mockFetchResponses(responses: Array<{ status?: number; body?: unknown; headers?: Record<string, string> }>) {
  const queue = [...responses];
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      const next = queue.shift();
      if (!next) return { ok: true, status: 200, json: async () => [], headers: new Headers() };
      return {
        ok: (next.status ?? 200) >= 200 && (next.status ?? 200) < 300,
        status: next.status ?? 200,
        statusText: next.status === 404 ? 'Not Found' : 'OK',
        json: async () => next.body ?? [],
        headers: new Headers(next.headers),
      };
    })
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('registration-cache', () => {
  beforeEach(() => {
    _resetForTesting();
    vi.clearAllMocks();
    process.env.BLOCKFROST_KEY_PREVIEW = 'test-key';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.BLOCKFROST_KEY_PREVIEW;
  });

  describe('initial state', () => {
    it('should not be ready before cold start', () => {
      expect(isReady()).toBe(false);
    });

    it('should return empty array for unknown stake key', () => {
      expect(getRegistrationsForStakeKey('unknown')).toEqual([]);
    });

    it('should report zero stats', () => {
      const stats = getCacheStats();
      expect(stats.initialized).toBe(false);
      expect(stats.totalRegistrations).toBe(0);
      expect(stats.uniqueStakeKeys).toBe(0);
    });
  });

  describe('cold start', () => {
    it('should populate cache from paginated Blockfrost response', async () => {
      const utxo1 = makeBlockfrostUtxo('tx1', 0, 'aa'.repeat(28), 'bb'.repeat(28));
      const utxo2 = makeBlockfrostUtxo('tx2', 0, 'cc'.repeat(28), 'dd'.repeat(28));

      mockFetchResponses([{ body: [utxo1, utxo2] }, { body: [] }, { body: [] }, { body: [] }, { body: [] }]);

      await _ensureFresh();

      expect(isReady()).toBe(true);
      expect(getCacheStats().totalRegistrations).toBe(2);
      expect(getCacheStats().uniqueStakeKeys).toBe(2);
      expect(getRegistrationsForStakeKey('aa'.repeat(28))).toHaveLength(1);
      expect(getRegistrationsForStakeKey('aa'.repeat(28))[0].dustPKH).toBe('bb'.repeat(28));
    });

    it('should handle multiple registrations for the same stake key', async () => {
      const utxo1 = makeBlockfrostUtxo('tx1', 0, 'aa'.repeat(28), 'bb'.repeat(28));
      const utxo2 = makeBlockfrostUtxo('tx2', 0, 'aa'.repeat(28), 'cc'.repeat(28));

      mockFetchResponses([{ body: [utxo1, utxo2] }, { body: [] }, { body: [] }, { body: [] }, { body: [] }]);

      await _ensureFresh();

      expect(getRegistrationsForStakeKey('aa'.repeat(28))).toHaveLength(2);
    });

    it('should skip UTxOs without inline datum', async () => {
      mockFetchResponses([
        {
          body: [
            {
              tx_hash: 'tx1',
              output_index: 0,
              amount: [{ unit: 'abc123policyid', quantity: '1' }],
              inline_datum: null,
            },
          ],
        },
        { body: [] },
        { body: [] },
        { body: [] },
        { body: [] },
      ]);

      await _ensureFresh();

      expect(isReady()).toBe(true);
      expect(getCacheStats().totalRegistrations).toBe(0);
    });

    it('should skip UTxOs without auth token', async () => {
      mockFetchResponses([
        {
          body: [
            {
              tx_hash: 'tx1',
              output_index: 0,
              amount: [{ unit: 'lovelace', quantity: '2000000' }],
              inline_datum: buildDatumHex('aa'.repeat(28), 'bb'.repeat(28)),
            },
          ],
        },
        { body: [] },
        { body: [] },
        { body: [] },
        { body: [] },
      ]);

      await _ensureFresh();

      expect(getCacheStats().totalRegistrations).toBe(0);
    });

    it('should handle Blockfrost 429 with retry', async () => {
      const utxo1 = makeBlockfrostUtxo('tx1', 0, 'aa'.repeat(28), 'bb'.repeat(28));

      let callCount = 0;
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => {
          callCount++;
          if (callCount === 1) {
            return {
              ok: false,
              status: 429,
              statusText: 'Too Many Requests',
              headers: new Headers({ 'Retry-After': '0' }),
              json: async () => ({}),
            };
          }
          if (callCount === 2) return { ok: true, status: 200, json: async () => [utxo1], headers: new Headers() };
          return { ok: true, status: 200, json: async () => [], headers: new Headers() };
        })
      );

      await _ensureFresh();

      expect(isReady()).toBe(true);
    });
  });

  describe('warm refresh', () => {
    async function seedCache(
      utxos: Array<{ tx_hash: string; output_index: number; stakeKeyHash: string; dustPKH: string }>
    ) {
      const blockfrostUtxos = utxos.map((u) =>
        makeBlockfrostUtxo(u.tx_hash, u.output_index, u.stakeKeyHash, u.dustPKH)
      );

      mockFetchResponses([{ body: blockfrostUtxos }, { body: [] }, { body: [] }, { body: [] }, { body: [] }]);

      await _ensureFresh();
      vi.unstubAllGlobals();
    }

    it('should add new registrations from warm refresh', async () => {
      await seedCache([{ tx_hash: 'tx1', output_index: 0, stakeKeyHash: 'aa'.repeat(28), dustPKH: 'bb'.repeat(28) }]);
      expect(getCacheStats().totalRegistrations).toBe(1);

      const newDatum = buildDatumHex('cc'.repeat(28), 'dd'.repeat(28));
      const newOutput = {
        tx_hash: 'tx2',
        output_index: 0,
        amount: [
          { unit: 'lovelace', quantity: '2000000' },
          { unit: 'abc123policyid', quantity: '1' },
        ],
        inline_datum: newDatum,
        address: 'addr_test1validator',
      };

      mockFetchResponses([
        { body: [{ tx_hash: 'tx2' }, { tx_hash: 'tx1' }] },
        { body: { hash: 'tx2', inputs: [], outputs: [newOutput] } },
      ]);

      await _ensureFresh();

      expect(getCacheStats().totalRegistrations).toBe(2);
      expect(getRegistrationsForStakeKey('cc'.repeat(28))).toHaveLength(1);
      expect(getRegistrationsForStakeKey('cc'.repeat(28))[0].dustPKH).toBe('dd'.repeat(28));
    });

    it('should remove consumed UTxOs during warm refresh', async () => {
      await seedCache([{ tx_hash: 'tx1', output_index: 0, stakeKeyHash: 'aa'.repeat(28), dustPKH: 'bb'.repeat(28) }]);
      expect(getCacheStats().totalRegistrations).toBe(1);

      mockFetchResponses([
        { body: [{ tx_hash: 'tx2' }, { tx_hash: 'tx1' }] },
        { body: { hash: 'tx2', inputs: [{ tx_hash: 'tx1', output_index: 0 }], outputs: [] } },
      ]);

      await _ensureFresh();

      expect(getCacheStats().totalRegistrations).toBe(0);
      expect(getRegistrationsForStakeKey('aa'.repeat(28))).toHaveLength(0);
    });

    it('should fall back to cold start if watermark not found', async () => {
      await seedCache([{ tx_hash: 'tx1', output_index: 0, stakeKeyHash: 'aa'.repeat(28), dustPKH: 'bb'.repeat(28) }]);

      const pages: Array<{ body: unknown }> = [];
      for (let i = 0; i < MAX_WARM_PAGES_COUNT; i++) {
        const txs = Array.from({ length: 100 }, (_, j) => ({ tx_hash: `newtx_${i}_${j}` }));
        pages.push({ body: txs });
      }

      const freshUtxo = makeBlockfrostUtxo('txfresh', 0, 'ee'.repeat(28), 'ff'.repeat(28));
      pages.push({ body: [freshUtxo] }, { body: [] }, { body: [] }, { body: [] }, { body: [] });

      mockFetchResponses(pages);

      await _ensureFresh();

      expect(getRegistrationsForStakeKey('aa'.repeat(28))).toHaveLength(0);
      expect(getRegistrationsForStakeKey('ee'.repeat(28))).toHaveLength(1);
    });

    it('should no-op when no new transactions', async () => {
      await seedCache([{ tx_hash: 'tx1', output_index: 0, stakeKeyHash: 'aa'.repeat(28), dustPKH: 'bb'.repeat(28) }]);
      const statsBefore = getCacheStats();

      mockFetchResponses([{ body: [{ tx_hash: 'tx1' }] }]);

      await _ensureFresh();

      expect(getCacheStats().totalRegistrations).toBe(statsBefore.totalRegistrations);
    });
  });

  describe('coalescing', () => {
    it('should coalesce concurrent ensureFresh calls', async () => {
      const utxo1 = makeBlockfrostUtxo('tx1', 0, 'aa'.repeat(28), 'bb'.repeat(28));

      mockFetchResponses([{ body: [utxo1] }, { body: [] }, { body: [] }, { body: [] }, { body: [] }]);

      const p1 = _ensureFresh();
      const p2 = _ensureFresh();

      await Promise.all([p1, p2]);

      expect(isReady()).toBe(true);
      expect(getCacheStats().totalRegistrations).toBe(1);
    });
  });

  describe('datum parsing', () => {
    it('should skip datums with wrong Constr index', async () => {
      // tag d87a = Constr index 1 (instead of 0)
      const badDatum = buildDatumHex('aa'.repeat(28), 'bb'.repeat(28), 'd87a');

      mockFetchResponses([
        {
          body: [
            {
              tx_hash: 'tx1',
              output_index: 0,
              amount: [{ unit: 'abc123policyid', quantity: '1' }],
              inline_datum: badDatum,
            },
          ],
        },
        { body: [] },
        { body: [] },
        { body: [] },
        { body: [] },
      ]);

      await _ensureFresh();

      expect(getCacheStats().totalRegistrations).toBe(0);
    });

    it('should skip datums with wrong inner Constr index', async () => {
      // Inner tag d87a = Constr index 1
      const badDatum = buildDatumHex('aa'.repeat(28), 'bb'.repeat(28), 'd879', 'd87a');

      mockFetchResponses([
        {
          body: [
            {
              tx_hash: 'tx1',
              output_index: 0,
              amount: [{ unit: 'abc123policyid', quantity: '1' }],
              inline_datum: badDatum,
            },
          ],
        },
        { body: [] },
        { body: [] },
        { body: [] },
        { body: [] },
      ]);

      await _ensureFresh();

      expect(getCacheStats().totalRegistrations).toBe(0);
    });

    it('should skip datums with invalid CBOR', async () => {
      mockFetchResponses([
        {
          body: [
            {
              tx_hash: 'tx1',
              output_index: 0,
              amount: [{ unit: 'abc123policyid', quantity: '1' }],
              inline_datum: 'deadbeef',
            },
          ],
        },
        { body: [] },
        { body: [] },
        { body: [] },
        { body: [] },
      ]);

      await _ensureFresh();

      expect(isReady()).toBe(true);
      expect(getCacheStats().totalRegistrations).toBe(0);
    });
  });
});
