import * as Contracts from '@/config/contract_blueprint';
import { initializeLucidWithBlockfrostClientSide } from '@/config/network';
import { getPolicyId, getValidatorAddress } from '@/lib/contractUtils';
import { logger } from '@/lib/logger';
import { toJson } from '@/lib/utils';
import { Constr, OutRef, UTxO } from '@lucid-evolution/lucid';
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
    isLoadingRegistrationUtxo: boolean;
    registrationUtxoError: string | null;
    refetch: () => Promise<void>;
    pollUntilFound: () => Promise<void>;
}

export function useRegistrationUtxo(cardanoAddress: string | null, dustPKH: string | null): UseRegistrationUtxoReturn {
    const [registrationUtxo, setRegistrationUtxo] = useState<UTxO | null>(null);
    const [isLoadingRegistrationUtxo, setIsLoadingRegistrationUtxo] = useState(false);
    const [registrationUtxoError, setRegistrationUtxoError] = useState<string | null>(null);

    // Track if we've already fetched for current params to avoid unnecessary re-fetches
    const lastFetchedRef = useRef<string>('');

    // Internal method to find registration UTXO - returns the UTXO or null
    const searchRegistrationUtxo = useCallback(async (): Promise<UTxO | null> => {
        try {
            logger.log('[RegistrationUtxo]', '🔍 Searching for registration UTXO...', { cardanoAddress, dustPKH });

            if (!cardanoAddress || !dustPKH) {
                throw new Error('Missing cardanoAddress or dustPKH');
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
            const response = await fetch(`/api/blockfrost/addresses/${dustGeneratorAddress}/utxos/${dustNFTAssetName}`);

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
                        if (
                            datumCardanoPKHConstr instanceof Constr &&
                            datumCardanoPKHConstr.index === 0 &&
                            datumCardanoPKHConstr.fields &&
                            datumCardanoPKHConstr.fields.length === 1
                        ) {
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

                        // Check if this UTXO matches our registration
                        if (datumCardanoPKH === stakeKeyHash && dustPKHFromDatum === dustPKH) {
                            const registrationOutRef: OutRef = {
                                txHash: utxo.tx_hash,
                                outputIndex: utxo.output_index,
                            };

                            // Initialize Lucid with Blockfrost using centralized configuration
                            const lucid = await initializeLucidWithBlockfrostClientSide();

                            const registrationUTxO = await lucid.utxosByOutRef([registrationOutRef]);

                            if (!registrationUTxO || registrationUTxO.length === 0) {
                                logger.log('[RegistrationUtxo]', '❌ No matching registration UTXO found');
                                return null;
                            }

                            logger.log('[RegistrationUtxo]', '✅ Found matching registration UTXO:', toJson(registrationUTxO[0]));
                            return registrationUTxO[0];
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
            logger.error('[RegistrationUtxo]', '❌ Error finding registration UTXO:', error);
            throw error;
        }
    }, [cardanoAddress, dustPKH]);

    // Method to find registration UTXO (single attempt, updates state)
    const findRegistrationUtxo = useCallback(async () => {
        setIsLoadingRegistrationUtxo(true);
        setRegistrationUtxoError(null);

        try {
            const utxo = await searchRegistrationUtxo();
            setRegistrationUtxo(utxo);
        } catch (error) {
            logger.error('[RegistrationUtxo]', '❌ Error finding registration UTXO:', error);
            setRegistrationUtxoError(error instanceof Error ? error.message : 'Failed to find registration UTXO');
            setRegistrationUtxo(null);
        } finally {
            setIsLoadingRegistrationUtxo(false);
        }
    }, [searchRegistrationUtxo]);

    const refetch = async () => {
        if (cardanoAddress && dustPKH) {
            await findRegistrationUtxo();
        }
    };

    // Poll until registration UTXO is found (useful after registration transaction)
    const pollUntilFound = useCallback(async () => {
        const MAX_ATTEMPTS = 20; // Maximum number of polling attempts
        const POLL_INTERVAL = 3000; // 3 seconds between attempts

        logger.log('[RegistrationUtxo]', '🔄 Starting polling for registration UTXO...');
        setIsLoadingRegistrationUtxo(true);
        setRegistrationUtxoError(null);

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            logger.log('[RegistrationUtxo]', `🔄 Polling attempt ${attempt}/${MAX_ATTEMPTS}`);

            try {
                // Search for the UTXO
                const utxo = await searchRegistrationUtxo();

                // If found, update state and return
                if (utxo) {
                    logger.log('[RegistrationUtxo]', '✅ Registration UTXO found after', attempt, 'attempts');
                    setRegistrationUtxo(utxo);
                    setIsLoadingRegistrationUtxo(false);
                    return;
                }

                // Wait before next attempt (except on last attempt)
                if (attempt < MAX_ATTEMPTS) {
                    logger.log('[RegistrationUtxo]', `⏳ Waiting ${POLL_INTERVAL / 1000}s before next attempt...`);
                    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
                }
            } catch (error) {
                logger.error('[RegistrationUtxo]', '❌ Error during polling attempt', attempt, error);

                // Continue trying unless it's the last attempt
                if (attempt < MAX_ATTEMPTS) {
                    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
                }
            }
        }

        // All attempts exhausted
        logger.log('[RegistrationUtxo]', '❌ Registration UTXO not found after', MAX_ATTEMPTS, 'attempts');
        setRegistrationUtxoError('Registration UTXO not found after polling. The transaction may still be pending on the blockchain. Please wait a moment and refresh the page.');
        setIsLoadingRegistrationUtxo(false);
    }, [searchRegistrationUtxo]);

    useEffect(() => {
        const fetchKey = `${cardanoAddress}-${dustPKH}`;

        if (cardanoAddress && dustPKH) {
            // Only fetch if params actually changed
            if (lastFetchedRef.current !== fetchKey) {
                lastFetchedRef.current = fetchKey;
                findRegistrationUtxo();
            }
        } else {
            lastFetchedRef.current = '';
            setRegistrationUtxo(null);
            setRegistrationUtxoError(null);
            setIsLoadingRegistrationUtxo(false);
        }
    }, [cardanoAddress, dustPKH, findRegistrationUtxo]);

    return {
        registrationUtxo,
        isLoadingRegistrationUtxo,
        registrationUtxoError,
        refetch,
        pollUntilFound,
    };
}
