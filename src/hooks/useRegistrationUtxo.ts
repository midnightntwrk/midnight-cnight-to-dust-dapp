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
}

export interface UseRegistrationUtxoReturn {
  registrationUtxo: UTxO | null;
  registrationDustPKH: string | null;
  isLoadingRegistrationUtxo: boolean;
  registrationUtxoError: string | null;
  refetch: () => Promise<void>;
  pollUntilFound: () => Promise<void>;
}

interface SearchResult {
  utxo: UTxO;
  dustPKH: string;
}

export function useRegistrationUtxo(cardanoAddress: string | null, dustPKH: string | null): UseRegistrationUtxoReturn {
  const [registrationUtxo, setRegistrationUtxo] = useState<UTxO | null>(null);
  const [registrationDustPKH, setRegistrationDustPKH] = useState<string | null>(null);
  const [isLoadingRegistrationUtxo, setIsLoadingRegistrationUtxo] = useState(false);
  const [registrationUtxoError, setRegistrationUtxoError] = useState<string | null>(null);

  // Track if we've already fetched for current params to avoid unnecessary re-fetches
  const lastFetchedRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Internal method to find registration UTXO - returns the UTXO and dustPKH from datum, or null
  const searchRegistrationUtxo = useCallback(
    async (signal?: AbortSignal): Promise<SearchResult | null> => {
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
        // Use descending order to get newest UTXOs first (helps with pagination)
        try {
          const response = await fetch(`/api/blockfrost/addresses/${dustGeneratorAddress}/utxos/${dustNFTAssetName}?order=desc`, {
            signal: signal,
          });

        } catch (e) {
          logger.error('Error in response from blockfrost', e)
        }

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

        logger.log('[RegistrationUtxo]', `🔍 Found ${validUtxos.length} valid UTXOs with auth token and inline datum`);

        if (validUtxos.length === 0) {
          return null;
        }

        // Warn if multiple registration UTXOs found — one Cardano address should only map to one dust address
        if (validUtxos.length > 1) {
          logger.warn('[RegistrationUtxo]', `⚠️ Found ${validUtxos.length} registration UTXOs for this address. Expected at most 1. Using the first match.`);
        }

        // Import Lucid for datum deserialization
        const { Data, Constr } = await import('@lucid-evolution/lucid');

        // Check each valid UTXO's datum to find matching registration
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
                logger.log('[RegistrationUtxo]', '❌ No matching registration UTXO found');
                return null;
              }
              // Convert DUST PKH bytes back to string
              // const dustPKHFromDatum = new TextDecoder().decode(new Uint8Array(dustPKH.match(/.{2}/g)?.map((byte: string) => parseInt(byte, 16)) || []));

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

              // Match by stake key hash; if dustPKH is provided, also verify it
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

                logger.log('[RegistrationUtxo]', '✅ Found matching registration UTXO:', toJson(registrationUTxO));
                logger.log('[RegistrationUtxo]', '🔑 Dust PKH from datum:', dustPKHFromDatum);
                return { utxo: registrationUTxO, dustPKH: dustPKHFromDatum };
              }
            }
          } catch (datumError) {
            logger.warn('[RegistrationUtxo]', '⚠️  Failed to deserialize datum for UTXO:', utxo.tx_hash, datumError);
            continue;
          }
        }

        // If we get here, no matching registration was found
        logger.log('[RegistrationUtxo]', '❌ No matching registration UTXO found');
        return null;
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
        setRegistrationUtxo(result?.utxo ?? null);
        setRegistrationDustPKH(result?.dustPKH ?? null);
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
  const pollUntilFound = useCallback(async () => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for polling
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // ✅ OPTIMIZATION: Use exponential backoff instead of constant interval
    // This reduces API calls while still being responsive
    const MAX_DURATION_MS = 120000; // 2 minutes total (same as before)
    const INITIAL_INTERVAL_MS = 3000; // Start with 3 seconds
    const MAX_INTERVAL_MS = 30000; // Cap at 30 seconds
    const BACKOFF_MULTIPLIER = 1.5; // Exponential growth factor

    logger.log('[RegistrationUtxo]', '🔄 Starting polling for registration UTXO with exponential backoff...');
    setIsLoadingRegistrationUtxo(true);
    setRegistrationUtxoError(null);

    const startTime = Date.now();
    let attempt = 0;

    while (Date.now() - startTime < MAX_DURATION_MS) {
      attempt++;

      // Check if polling was cancelled
      if (abortController.signal.aborted || !isMountedRef.current) {
        logger.log('[RegistrationUtxo]', '⏸️ Polling cancelled');
        return;
      }

      logger.log('[RegistrationUtxo]', `🔄 Polling attempt ${attempt}`);

      try {
        // Search for the UTXO
        const result = await searchRegistrationUtxo(abortController.signal);

        // Check again if cancelled after async operation
        if (abortController.signal.aborted || !isMountedRef.current) {
          return;
        }

        // If found, update state and return
        if (result) {
          const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
          logger.log('[RegistrationUtxo]', `✅ Registration UTXO found after ${attempt} attempts in ${elapsedSeconds}s`);
          setRegistrationUtxo(result.utxo);
          setRegistrationDustPKH(result.dustPKH);
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
  }, [searchRegistrationUtxo]);

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
    isLoadingRegistrationUtxo,
    registrationUtxoError,
    refetch,
    pollUntilFound,
  };
}
