import * as Contracts from '@/config/contract_blueprint';
import { getPolicyId, getValidatorAddress } from '@/lib/contractUtils';
import { logger } from '@/lib/logger';
import { toJson } from '@/lib/utils';
import { Constr, UTxO } from '@lucid-evolution/lucid';
import { useCallback, useEffect, useRef, useState } from 'react';

// Blockfrost UTXO response type
interface BlockfrostUtxo {
  tx_hash: string;
  output_index: number;
  amount?: Array<{ unit: string; quantity: string }>;
  inline_datum: string | null;
  address?: string;
}

// Blockfrost txs/{hash}/utxos response
interface BlockfrostTxUtxosResponse {
  hash: string;
  inputs: BlockfrostUtxo[];
  outputs: BlockfrostUtxo[];
}

export interface UseRegistrationUtxoReturn {
  registrationUtxo: UTxO | null;
  registrationDustPKH: string | null;
  replicateUtxos: UTxO[];
  isLoadingRegistrationUtxo: boolean;
  registrationUtxoError: string | null;
  refetch: () => Promise<void>;
  pollUntilFound: (txHash?: string) => Promise<void>;
}

interface SearchResult {
  utxo: UTxO;
  dustPKH: string;
}

interface SearchAllResult {
  primary: SearchResult;
  replicates: UTxO[];
}

export function useRegistrationUtxo(cardanoAddress: string | null, dustPKH: string | null): UseRegistrationUtxoReturn {
  const [registrationUtxo, setRegistrationUtxo] = useState<UTxO | null>(null);
  const [registrationDustPKH, setRegistrationDustPKH] = useState<string | null>(null);
  const [replicateUtxos, setReplicateUtxos] = useState<UTxO[]>([]);
  const [isLoadingRegistrationUtxo, setIsLoadingRegistrationUtxo] = useState(false);
  const [registrationUtxoError, setRegistrationUtxoError] = useState<string | null>(null);

  // Track if we've already fetched for current params to avoid unnecessary re-fetches
  const lastFetchedRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Helper: try to find registration UTXO from tx outputs (faster on mainnet - no address index delay)
  const searchByTxHash = useCallback(
    async (txHash: string, signal?: AbortSignal): Promise<SearchResult | null> => {
      if (!cardanoAddress) return null;
      try {
        const response = await fetch(`/api/blockfrost/txs/${txHash}/utxos`, { signal });
        if (!response.ok) return null;
        const data: BlockfrostTxUtxosResponse = await response.json();
        if (!data.outputs?.length) return null;

        const dustGenerator = new Contracts.CnightGeneratesDustCnightGeneratesDustElse();
        const dustGeneratorAddress = getValidatorAddress(dustGenerator.Script);
        const dustNFTAssetName = getPolicyId(dustGenerator.Script) + '';
        const { getAddressDetails } = await import('@lucid-evolution/lucid');
        const stakeKeyHash = getAddressDetails(cardanoAddress)?.stakeCredential?.hash;
        const { Data, Constr } = await import('@lucid-evolution/lucid');

        for (const output of data.outputs) {
          if (output.address !== dustGeneratorAddress) continue;
          const hasAuthToken = output.amount?.some((a) => a.unit === dustNFTAssetName && a.quantity === '1');
          if (!hasAuthToken || !output.inline_datum) continue;
          try {
            const datumData = Data.from(output.inline_datum);
            if (!(datumData instanceof Constr) || datumData.index !== 0 || !datumData.fields?.length) continue;
            const [datumCardanoPKHConstr, dustPKHFromDatum] = datumData.fields as [Constr<string>, string];
            const datumCardanoPKH =
              datumCardanoPKHConstr instanceof Constr && datumCardanoPKHConstr.fields?.length
                ? datumCardanoPKHConstr.fields[0]
                : null;
            if (!datumCardanoPKH || (stakeKeyHash && datumCardanoPKH !== stakeKeyHash)) continue;
            if (dustPKH && typeof dustPKHFromDatum === 'string' && dustPKHFromDatum !== dustPKH) continue;
            const assets: Record<string, bigint> = {};
            for (const a of output.amount || []) assets[a.unit] = BigInt(a.quantity);
            return {
              utxo: {
                txHash: data.hash,
                outputIndex: output.output_index,
                address: dustGeneratorAddress,
                assets,
                datum: output.inline_datum,
              },
              dustPKH: typeof dustPKHFromDatum === 'string' ? dustPKHFromDatum : '',
            };
          } catch {
            continue;
          }
        }
        return null;
      } catch {
        return null;
      }
    },
    [cardanoAddress, dustPKH]
  );

  // Internal method to find all registration UTXOs matching stake key - returns primary + duplicates
  const searchRegistrationUtxo = useCallback(
    async (signal?: AbortSignal): Promise<SearchAllResult | null> => {
      try {
        logger.log('[RegistrationUtxo]', '🔍 Searching for registration UTXO...', { cardanoAddress, dustPKH });

        if (!cardanoAddress) {
          throw new Error('Missing cardanoAddress');
        }

        // Get DUST Generator contract
        const dustGenerator = new Contracts.CnightGeneratesDustCnightGeneratesDustElse();
        const dustGeneratorAddress = getValidatorAddress(dustGenerator.Script);

        logger.log(
          '[DustTransactions]',
          '📋 DUST Generator Address:',
          toJson({
            dustGeneratorAddress,
          })
        );

        // Get current user's stake key hash
        const { getAddressDetails } = await import('@lucid-evolution/lucid');
        const addressDetails = getAddressDetails(cardanoAddress);
        const stakeKeyHash = addressDetails?.stakeCredential?.hash;

        // Construct the expected NFT asset name
        const dustNFTTokenName = '';
        const dustNFTAssetName = getPolicyId(dustGenerator.Script) + dustNFTTokenName;

        logger.log('[RegistrationUtxo]', '🪙 Looking for NFT:', {
          policyId: getPolicyId(dustGenerator.Script),
          tokenName: dustNFTTokenName,
          assetName: dustNFTAssetName,
        });

        // Query UTXOs at the mapping validator address using Blockfrost proxy
        const response = await fetch(`/api/blockfrost/addresses/${dustGeneratorAddress}/utxos/${dustNFTAssetName}?order=desc`, {
          signal: signal,
        });
        if (!response.ok) {
          throw new Error(`Blockfrost API error: ${response.status} ${response.statusText}`);
        }

        const utxos = await response.json();
        logger.log('[RegistrationUtxo]', `📥 Found ${utxos.length} UTXOs at mapping validator address`);

        // Filter UTXOs that contain the DUST Auth Token
        const validUtxos: BlockfrostUtxo[] = utxos.filter((utxo: BlockfrostUtxo) => {
          const hasAuthToken = utxo.amount?.some((asset: { unit: string; quantity: string }) => asset.unit === dustNFTAssetName && asset.quantity === '1');
          const hasInlineDatum = utxo.inline_datum !== null;
          return hasAuthToken && hasInlineDatum;
        });

        logger.log('[RegistrationUtxo]', `🔍 Found ${validUtxos.length} UTXOs at validator address with auth token (all users, pre-filter)`);

        if (validUtxos.length === 0) {
          return null;
        }

        // Import Lucid for datum deserialization
        const { Data, Constr } = await import('@lucid-evolution/lucid');

        // Collect ALL matching UTXOs for this stake key (to detect duplicates)
        const allMatches: SearchResult[] = [];

        // Check each valid UTXO's datum to find matching registrations
        for (const utxo of validUtxos) {
          try {
            // Deserialize the inline datum
            const datumData = Data.from(utxo.inline_datum!);

            // Check if datumData is a Constr with the expected structure
            if (datumData instanceof Constr && datumData.index === 0 && datumData.fields && datumData.fields.length === 2) {
              const [datumCardanoPKHConstr, dustPKHFromDatum] = datumData.fields as [Constr<string>, string];
              let datumCardanoPKH: string;
              if (datumCardanoPKHConstr instanceof Constr && datumCardanoPKHConstr.index === 0 && datumCardanoPKHConstr.fields && datumCardanoPKHConstr.fields.length === 1) {
                datumCardanoPKH = datumCardanoPKHConstr.fields[0];
              } else {
                continue;
              }

              logger.log(
                '[RegistrationUtxo]',
                '📋 Comparing datum values:',
                toJson({
                  datumStakeKeyHash: datumCardanoPKH,
                  expectedStakeKeyHash: stakeKeyHash,
                  datumDustPKH: dustPKHFromDatum,
                  expectedDustPKH: dustPKH,
                })
              );

              if (typeof dustPKHFromDatum !== 'string') {
                logger.warn('[RegistrationUtxo]', '⚠️ Unexpected dustPKH type in datum:', typeof dustPKHFromDatum);
                continue;
              }

              // Match by stake key hash and dustPKH (exact replicates)
              const stakeKeyMatches = datumCardanoPKH === stakeKeyHash;
              const dustPKHMatches = !dustPKH || dustPKHFromDatum === dustPKH;

              if (stakeKeyMatches && dustPKHMatches) {
                // Convert Blockfrost amount array to Lucid assets Record
                const assets: Record<string, bigint> = {};
                if (utxo.amount) {
                  for (const asset of utxo.amount) {
                    assets[asset.unit] = BigInt(asset.quantity);
                  }
                }

                // Construct Lucid UTxO directly from Blockfrost data
                const registrationUTxO: UTxO = {
                  txHash: utxo.tx_hash,
                  outputIndex: utxo.output_index,
                  address: dustGeneratorAddress,
                  assets: assets,
                  datum: utxo.inline_datum || undefined,
                };

                allMatches.push({ utxo: registrationUTxO, dustPKH: dustPKHFromDatum });
              }
            }
          } catch (datumError) {
            logger.warn('[RegistrationUtxo]', '⚠️  Failed to deserialize datum for UTXO:', utxo.tx_hash, datumError);
            continue;
          }
        }

        if (allMatches.length === 0) {
          logger.log('[RegistrationUtxo]', '❌ No matching registration UTXO found');
          return null;
        }

        // Primary = first match (most recent due to order=desc); rest are replicates
        const primary = allMatches[0];
        const replicates = allMatches.slice(1).map((m) => m.utxo);

        logger.log('[RegistrationUtxo]', `✅ Found ${allMatches.length} matching registration UTXO(s) (${replicates.length} replicate(s))`, toJson(primary.utxo));
        logger.log('[RegistrationUtxo]', '🔑 Dust PKH from datum:', primary.dustPKH);

        return { primary, replicates };
      } catch (error) {
        // Don't throw if the request was aborted
        if (error instanceof Error && error.name === 'AbortError') {
          logger.log('[RegistrationUtxo]', '⏸️ Request aborted');
          return null;
        }
        logger.error('[RegistrationUtxo]', '❌ Error finding registration UTXO:', error);
        throw error;
      }
    },
    [cardanoAddress, dustPKH]
  );

  // Method to find registration UTXO (single attempt, updates state)
  const findRegistrationUtxo = useCallback(async () => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoadingRegistrationUtxo(true);
    setRegistrationUtxoError(null);

    try {
      const result = await searchRegistrationUtxo(abortController.signal);
      // Only update state if component is still mounted and request wasn't aborted
      if (isMountedRef.current && !abortController.signal.aborted) {
        setRegistrationUtxo(result?.primary.utxo ?? null);
        setRegistrationDustPKH(result?.primary.dustPKH ?? null);
        setReplicateUtxos(result?.replicates ?? []);
      }
    } catch (error) {
      // Don't set error if request was aborted or component unmounted
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      if (isMountedRef.current) {
        logger.error('[RegistrationUtxo]', '❌ Error finding registration UTXO:', error);
        setRegistrationUtxoError(error instanceof Error ? error.message : 'Failed to find registration UTXO');
        setRegistrationUtxo(null);
        setRegistrationDustPKH(null);
        setReplicateUtxos([]);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingRegistrationUtxo(false);
      }
    }
  }, [searchRegistrationUtxo]);

  const refetch = async () => {
    if (cardanoAddress && dustPKH) {
      await findRegistrationUtxo();
    }
  };

  // Poll until registration UTXO is found (useful after registration transaction)
  // When txHash is provided, try txs/{hash}/utxos first (faster on mainnet - no address index delay)
  const pollUntilFound = useCallback(
    async (txHash?: string) => {
      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller for polling
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Mainnet needs longer - Blockfrost address index can lag
      const MAX_DURATION_MS = 300000; // 5 minutes
      const INITIAL_INTERVAL_MS = 3000;
      const MAX_INTERVAL_MS = 30000;
      const BACKOFF_MULTIPLIER = 1.5;

      logger.log('[RegistrationUtxo]', '🔄 Starting polling for registration UTXO...', txHash ? { txHash } : {});
      setIsLoadingRegistrationUtxo(true);
      setRegistrationUtxoError(null);

      const startTime = Date.now();
      let attempt = 0;

      const doSearch = async (): Promise<SearchAllResult | null> => {
        if (txHash) {
          const txResult = await searchByTxHash(txHash, abortController.signal);
          if (txResult) return { primary: txResult, replicates: [] };
        }
        return searchRegistrationUtxo(abortController.signal);
      };

      while (Date.now() - startTime < MAX_DURATION_MS) {
        attempt++;

        if (abortController.signal.aborted || !isMountedRef.current) {
          logger.log('[RegistrationUtxo]', '⏸️ Polling cancelled');
          return;
        }

        logger.log('[RegistrationUtxo]', `🔄 Polling attempt ${attempt}`);

        try {
          const result = await doSearch();

        // Check again if cancelled after async operation
        if (abortController.signal.aborted || !isMountedRef.current) {
          return;
        }

        // If found, update state and return
        if (result) {
          const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
          logger.log('[RegistrationUtxo]', `✅ Registration UTXO found after ${attempt} attempts in ${elapsedSeconds}s`);
          setRegistrationUtxo(result.primary.utxo);
          setRegistrationDustPKH(result.primary.dustPKH);
          setReplicateUtxos(result.replicates);
          setIsLoadingRegistrationUtxo(false);
          return;
        }

        // Calculate next backoff interval with exponential growth
        // Formula: min(INITIAL * (MULTIPLIER ^ (attempt - 1)), MAX)
        // Results: 3s → 4.5s → 6.75s → 10.1s → 15.2s → 22.8s → 30s → 30s...
        const nextInterval = Math.min(INITIAL_INTERVAL_MS * Math.pow(BACKOFF_MULTIPLIER, attempt - 1), MAX_INTERVAL_MS);

        // Check if we have time for another attempt
        const timeRemaining = MAX_DURATION_MS - (Date.now() - startTime);
        if (timeRemaining <= 0) {
          break; // No time left
        }

        // Wait for the calculated interval (or remaining time, whichever is less)
        const waitTime = Math.min(nextInterval, timeRemaining);
        logger.log('[RegistrationUtxo]', `⏳ Waiting ${(waitTime / 1000).toFixed(1)}s before next attempt...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      } catch (error) {
        // Don't log error if request was aborted
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }

        // Check if component is still mounted before logging
        if (!isMountedRef.current) {
          return;
        }

        logger.error('[RegistrationUtxo]', '❌ Error during polling attempt', attempt, error);

        // Calculate backoff even on error
        const nextInterval = Math.min(INITIAL_INTERVAL_MS * Math.pow(BACKOFF_MULTIPLIER, attempt - 1), MAX_INTERVAL_MS);

        const timeRemaining = MAX_DURATION_MS - (Date.now() - startTime);
        if (timeRemaining > 0) {
          const waitTime = Math.min(nextInterval, timeRemaining);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }

    // Timeout reached - only update state if still mounted
    if (isMountedRef.current && !abortController.signal.aborted) {
      const totalSeconds = ((Date.now() - startTime) / 1000).toFixed(0);
      logger.log('[RegistrationUtxo]', `❌ Registration UTXO not found after ${attempt} attempts in ${totalSeconds}s`);
      setRegistrationUtxoError('Registration UTXO not found after polling. The transaction may still be pending on the blockchain. Please wait a moment and refresh the page.');
      setIsLoadingRegistrationUtxo(false);
    }
  }, [searchRegistrationUtxo, searchByTxHash]);

  useEffect(() => {
    isMountedRef.current = true;

    const fetchKey = `${cardanoAddress}-${dustPKH || 'any'}`;

    if (cardanoAddress) {
      // Only fetch if params actually changed
      if (lastFetchedRef.current !== fetchKey) {
        lastFetchedRef.current = fetchKey;
        findRegistrationUtxo();
      }
    } else {
      lastFetchedRef.current = '';
      if (isMountedRef.current) {
        setRegistrationUtxo(null);
        setReplicateUtxos([]);
        setRegistrationUtxoError(null);
        setIsLoadingRegistrationUtxo(false);
      }
    }

    // Cleanup: mark as unmounted and abort any pending requests
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [cardanoAddress, dustPKH, findRegistrationUtxo]);

  return {
    registrationUtxo,
    registrationDustPKH,
    replicateUtxos,
    isLoadingRegistrationUtxo,
    registrationUtxoError,
    refetch,
    pollUntilFound,
  };
}
