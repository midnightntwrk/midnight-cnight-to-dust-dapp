/** Caching/Indexing system for Cardano-Dust registrations
* Starts a full scan of all mapping-validator UTXOs on boot,
* and stores them in a Map from StakeKey -> DustAddress for O(1) lookup.
*
* Updates the maps by polling for new transactions.
* */
import { dustGeneratorDetails, parseDustMappingDatum } from '@/lib/contractUtils';
import { blockfrostFetch } from '@/lib/blockfrost-client';
import { logger } from '@/lib/logger';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface CachedRegistration {
  txHash: string;
  outputIndex: number;
  validatorAddress: string;
  stakeKeyHash: string;
  dustPKH: string;
  inlineDatum: string;
  amount: Array<{ unit: string; quantity: string }>;
}

export interface CacheStats {
  totalRegistrations: number;
  uniqueStakeKeys: number;
  initialized: boolean;
  lastRefreshAt: number | null;
  refreshCount: number;
}

interface BlockfrostUtxo {
  tx_hash: string;
  output_index: number;
  amount: Array<{ unit: string; quantity: string }>;
  inline_datum: string | null;
  address?: string;
}

interface BlockfrostTxUtxosResponse {
  hash: string;
  inputs: BlockfrostUtxo[];
  outputs: BlockfrostUtxo[];
}

interface BlockfrostAssetTransaction {
  tx_hash: string;
  tx_index: number;
  block_height: number;
  block_time: number;
}

// ── Cache state ──────────────────────────────────────────────────────────────────

interface CacheState {
  stakeKeyMap: Map<string, CachedRegistration[]>;
  utxoRefMap: Map<string, string>; // "txHash:outputIndex" → stakeKeyHash
  lastKnownTxHash: string | null;
  initialized: boolean;
  refreshInProgress: Promise<void> | null;
  lastRefreshAt: number | null;
  refreshCount: number;
  refreshInterval: ReturnType<typeof setInterval> | null;
}

// globalThis singleton survives in production (standalone). In dev mode, Next.js
// re-evaluates server modules per request, so the cache reinitializes each time.
const globalForCache = globalThis as typeof globalThis & { __registrationCache?: CacheState };

function getOrCreateState(): CacheState {
  if (!globalForCache.__registrationCache) {
    globalForCache.__registrationCache = {
      stakeKeyMap: new Map(),
      utxoRefMap: new Map(),
      lastKnownTxHash: null,
      initialized: false,
      refreshInProgress: null,
      lastRefreshAt: null,
      refreshCount: 0,
      refreshInterval: null,
    };
  }
  return globalForCache.__registrationCache;
}

const state = getOrCreateState();

// ── Constants ──────────────────────────────────────────────────────────────────

const MAX_CACHE_ENTRIES = 500_000;
const REFRESH_INTERVAL_MS = 30_000;
const COLD_START_CONCURRENCY = 5;
const BLOCKFROST_PAGE_SIZE = 100;
const MAX_WARM_PAGES = 50;

// ── Map mutations (synchronous — no awaits) ────────────────────────────────────

function refMapKey(txHash: string, outputIndex: number) {
  return `${txHash}:${outputIndex}`
}

function addEntry(registration: CachedRegistration): void {
  if (state.utxoRefMap.size >= MAX_CACHE_ENTRIES) {
    logger.warn('[RegistrationCache]', `Cache size limit reached (${MAX_CACHE_ENTRIES}), skipping new entry`);
    return;
  }

  const ref = refMapKey(registration.txHash, registration.outputIndex)
  if (state.utxoRefMap.has(ref)) return; // already tracked

  state.utxoRefMap.set(ref, registration.stakeKeyHash);

  const existing = state.stakeKeyMap.get(registration.stakeKeyHash);
  if (existing) {
    existing.push(registration);
  } else {
    state.stakeKeyMap.set(registration.stakeKeyHash, [registration]);
  }
}

function removeEntry(txHash: string, outputIndex: number): void {
  const ref = refMapKey(txHash, outputIndex)
  const stakeKeyHash = state.utxoRefMap.get(ref);
  if (!stakeKeyHash) return;

  state.utxoRefMap.delete(ref);

  const entries = state.stakeKeyMap.get(stakeKeyHash);
  if (entries) {
    const idx = entries.findIndex((e) => e.txHash === txHash && e.outputIndex === outputIndex);
    if (idx !== -1) entries.splice(idx, 1);
    if (entries.length === 0) state.stakeKeyMap.delete(stakeKeyHash);
  }
}

function toRegistration(utxo: BlockfrostUtxo, validatorAddress: string, assetName: string): CachedRegistration | null {
  if (utxo.address !== validatorAddress) return null;
  if (!utxo.inline_datum) return null;
  const hasAuthToken = utxo.amount?.some((a) => a.unit === assetName && a.quantity === '1');
  if (!hasAuthToken) return null;
  const parsed = parseDustMappingDatum(utxo.inline_datum);
  if (!parsed) return null;
  return {
    txHash: utxo.tx_hash,
    outputIndex: utxo.output_index,
    validatorAddress,
    stakeKeyHash: parsed.stakeKeyHash,
    dustPKH: parsed.dustPKH,
    inlineDatum: utxo.inline_datum,
    amount: utxo.amount,
  };
}

// ── Cold start ─────────────────────────────────────────────────────────────────

// RegistrationCache cold start
// Iterates through all the UTXOs for the dust mapping contract
// Initializes the maps for each stake key
// Uses: https://docs.blockfrost.io/#tag/cardano--addresses/GET/addresses/{address}/utxos/{asset}
async function coldStart(): Promise<void> {
  const { validatorAddress, assetName } = dustGeneratorDetails;
  logger.log('[RegistrationCache]', 'Starting cold start...');

  const registrations: CachedRegistration[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const pagesToFetch = Array.from({ length: COLD_START_CONCURRENCY }, (_, i) => page + i);

    const pageResults = await Promise.all(
      pagesToFetch.map((p) =>
        blockfrostFetch<BlockfrostUtxo[]>(`/addresses/${validatorAddress}/utxos/${assetName}?page=${p}&order=desc`)
      )
    );

    for (const utxos of pageResults) {
      if (!Array.isArray(utxos) || utxos.length === 0) {
        hasMore = false;
        break;
      }

      const parsed = utxos.flatMap((u) => toRegistration(u, validatorAddress, assetName) ?? []);
      registrations.push(...parsed);

      if (utxos.length < BLOCKFROST_PAGE_SIZE) {
        hasMore = false;
        break;
      }
    }

    page += pagesToFetch.length;

    if (page % 10 === 1 || !hasMore) {
      logger.log(
        '[RegistrationCache]',
        `Cold start progress: ${registrations.length} registrations (page ${page - 1})`
      );
    }
  }

  // Sync phase: apply all mutations at once (no awaits)
  state.stakeKeyMap.clear();
  state.utxoRefMap.clear();
  for (const reg of registrations) {
    addEntry(reg);
  }

  // Watermark = most recent tx hash (first result because order=desc)
  if (registrations.length > 0) {
    state.lastKnownTxHash = registrations[0].txHash;
  }

  state.initialized = true;
  state.lastRefreshAt = Date.now();

  logger.log(
    '[RegistrationCache]',
    `Cold start complete: ${registrations.length} registrations, ${state.stakeKeyMap.size} unique stake keys`
  );
}

// ── Warm refresh ───────────────────────────────────────────────────────────────

// RegistrationCache Warm refresh
// Iterates through all *new* transactions for the contract until it finds the last known txHash
// Removes spend UTXOs, adds new UTXOs
// Uses: https://docs.blockfrost.io/#tag/cardano--assets/GET/assets/{asset}/transactions
async function warmRefresh(): Promise<void> {
  if (!state.initialized || !state.lastKnownTxHash) return;

  const { validatorAddress, assetName } = dustGeneratorDetails;

  // Phase 1: discover new transactions (async)
  const newTxHashes: string[] = [];
  let page = 1;
  let foundWatermark = false;

  while (!foundWatermark && page <= MAX_WARM_PAGES) {
    const txs = await blockfrostFetch<BlockfrostAssetTransaction[]>(
      `/assets/${assetName}/transactions?order=desc&page=${page}`
    );

    if (!Array.isArray(txs) || txs.length === 0) break;

    for (const tx of txs) {
      if (tx.tx_hash === state.lastKnownTxHash) {
        foundWatermark = true;
        break;
      }
      newTxHashes.push(tx.tx_hash);
    }

    if (txs.length < BLOCKFROST_PAGE_SIZE) break;
    page++;
  }

  if (!foundWatermark && page > MAX_WARM_PAGES) {
    logger.warn('[RegistrationCache]', `Watermark not found after ${MAX_WARM_PAGES} pages, falling back to cold start`);
    await coldStart();
    return;
  }

  if (newTxHashes.length === 0) return;

  // Fetch UTxO details for each new transaction
  const adds: CachedRegistration[] = [];
  const removes: Array<{ txHash: string; outputIndex: number }> = [];

  for (const txHash of newTxHashes) {
    const txUtxos = await blockfrostFetch<BlockfrostTxUtxosResponse>(`/txs/${txHash}/utxos`);

    // Inputs = consumed UTxOs (potential removes)
    if (txUtxos.inputs) {
      for (const input of txUtxos.inputs) {
        const ref = `${input.tx_hash}:${input.output_index}`;
        if (state.utxoRefMap.has(ref)) {
          removes.push({ txHash: input.tx_hash, outputIndex: input.output_index });
        }
      }
    }

    // Outputs = new UTxOs at the validator address (potential adds)
    if (txUtxos.outputs) {
      adds.push(...txUtxos.outputs.flatMap((o) => toRegistration(o, validatorAddress, assetName) ?? []));
    }
  }

  // Phase 2: apply mutations synchronously (no awaits — readers cannot interleave)
  for (const remove of removes) {
    removeEntry(remove.txHash, remove.outputIndex);
  }
  for (const add of adds) {
    addEntry(add);
  }

  // Update watermark to most recent tx
  state.lastKnownTxHash = newTxHashes[0];
  state.lastRefreshAt = Date.now();
  state.refreshCount++;

  if (adds.length > 0 || removes.length > 0) {
    logger.log(
      '[RegistrationCache]',
      `Warm refresh: +${adds.length} -${removes.length} (${state.stakeKeyMap.size} stake keys, ${state.utxoRefMap.size} UTxOs)`
    );
  }
}

// ── Refresh orchestration ──────────────────────────────────────────────────────

async function ensureFresh(): Promise<void> {
  if (state.refreshInProgress) return state.refreshInProgress;

  state.refreshInProgress = (async () => {
    try {
      if (!state.initialized) {
        await coldStart();
      } else {
        await warmRefresh();
      }
    } catch (error) {
      logger.error(
        '[RegistrationCache]',
        'Refresh failed:',
        error instanceof Error ? { message: error.message, stack: error.stack } : error
      );
    } finally {
      state.refreshInProgress = null;
    }
  })();

  return state.refreshInProgress;
}

function startRefreshInterval(): void {
  if (state.refreshInterval) return;
  state.refreshInterval = setInterval(() => {
    ensureFresh().catch((err) => {
      logger.error('[RegistrationCache]', 'Scheduled refresh failed:', err);
    });
  }, REFRESH_INTERVAL_MS);
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function getRegistrationsForStakeKey(stakeKeyHash: string): CachedRegistration[] {
  return state.stakeKeyMap.get(stakeKeyHash) ?? [];
}

export function isReady(): boolean {
  return state.initialized;
}

export function getCacheStats(): CacheStats {
  return {
    totalRegistrations: state.utxoRefMap.size,
    uniqueStakeKeys: state.stakeKeyMap.size,
    initialized: state.initialized,
    lastRefreshAt: state.lastRefreshAt,
    refreshCount: state.refreshCount,
  };
}

// ── Test helpers ───────────────────────────────────────────────────────────────

export function _resetForTesting(): void {
  state.stakeKeyMap.clear();
  state.utxoRefMap.clear();
  state.lastKnownTxHash = null;
  state.initialized = false;
  state.refreshInProgress = null;
  state.lastRefreshAt = null;
  state.refreshCount = 0;
  if (state.refreshInterval) {
    clearInterval(state.refreshInterval);
    state.refreshInterval = null;
  }
}

export { ensureFresh as _ensureFresh };

export function _debugStakeKeySample(n: number = 5): string[] {
  return Array.from(state.stakeKeyMap.keys()).slice(0, n);
}

// ── Warm-on-startup ────────────────────────────────────────────────────────────
// Skip during tests, next build (no API keys available), and duplicate module evaluations.

const isBuild = process.env.NEXT_PHASE === 'phase-production-build';

if (!isBuild && process.env.NODE_ENV !== 'test' && !state.initialized && !state.refreshInProgress) {
  ensureFresh().then(() => {
    startRefreshInterval();
  });
}
