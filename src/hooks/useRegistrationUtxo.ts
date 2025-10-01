import { useCallback, useEffect, useState, useRef } from 'react';
import { ContractUtils } from '@/lib/contractUtils';
import { useDustProtocol } from '@/contexts/DustProtocolContext';
import { getAddressDetails, OutRef, toHex, UTxO } from '@lucid-evolution/lucid';
import { toJson } from '@/lib/utils';
import { initializeLucidWithBlockfrostClientSide } from '@/config/network';

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

    // Get contracts from DUST protocol context
    const { contracts, isContractsLoaded } = useDustProtocol();

    // Internal method to find registration UTXO - returns the UTXO or null
    const searchRegistrationUtxo = useCallback(async (): Promise<UTxO | null> => {
        try {
            console.log('[RegistrationUtxo]', '🔍 Searching for registration UTXO...', { cardanoAddress, dustPKH });

            if (!cardanoAddress || !dustPKH) {
                throw new Error('Missing cardanoAddress or dustPKH');
            }

            // Check if contracts are loaded
            if (!isContractsLoaded) {
                throw new Error('DUST protocol contracts not loaded yet');
            }

            const dustMappingValidatorContract = ContractUtils.getContract(contracts, 'dust-mapping-validator.plutus');
            const dustAuthTokenPolicyContract = ContractUtils.getContract(contracts, 'dust-auth-token-policy.plutus');

            if (!dustMappingValidatorContract?.address) {
                throw new Error('DUST Mapping Validator contract not found or invalid');
            }

            if (!dustAuthTokenPolicyContract?.policyId) {
                throw new Error('DUST Auth Token Policy contract not found or invalid');
            }

            // Get environment variables for registration
            const cardanoPKH = getAddressDetails(cardanoAddress)?.paymentCredential?.hash;

            // Construct the expected auth token asset name
            const dustTokenName = toHex(new TextEncoder().encode('DUST production auth token'));
            const dustAuthTokenAssetName = dustAuthTokenPolicyContract.policyId! + dustTokenName;

            console.log('[RegistrationUtxo]', '🪙 Looking for auth token:', {
                policyId: dustAuthTokenPolicyContract.policyId,
                tokenName: 'DUST production auth token',
                assetName: dustAuthTokenAssetName,
            });

            // Query UTXOs at the mapping validator address using Blockfrost proxy
            const response = await fetch(`/api/blockfrost/addresses/${dustMappingValidatorContract.address}/utxos/${dustAuthTokenAssetName}`);

            if (!response.ok) {
                throw new Error(`Blockfrost API error: ${response.status} ${response.statusText}`);
            }

            const utxos = await response.json();
            console.log('[RegistrationUtxo]', `📥 Found ${utxos.length} UTXOs at mapping validator address`);

            // Filter UTXOs that contain the DUST Auth Token
            const validUtxos: BlockfrostUtxo[] = utxos.filter((utxo: BlockfrostUtxo) => {
                const hasAuthToken = utxo.amount?.some((asset: { unit: string; quantity: string }) => asset.unit === dustAuthTokenAssetName && asset.quantity === '1');
                const hasInlineDatum = utxo.inline_datum !== null;
                return hasAuthToken && hasInlineDatum;
            });

            console.log('[RegistrationUtxo]', `🔍 Found ${validUtxos.length} valid UTXOs with auth token and inline datum`);

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
                        const [datumCardanoPKH, dustPKHBytes] = datumData.fields as [string, string];

                        // Convert DUST PKH bytes back to string
                        const dustPKHFromDatum = new TextDecoder().decode(new Uint8Array(dustPKHBytes.match(/.{2}/g)?.map((byte: string) => parseInt(byte, 16)) || []));

                        console.log(
                            '[RegistrationUtxo]',
                            '📋 Comparing datum values:',
                            toJson({
                                datumCardanoPKH,
                                expectedCardanoPKH: cardanoPKH,
                                datumDustPKH: dustPKHFromDatum,
                                expectedDustPKH: dustPKH,
                            })
                        );

                        // Check if this UTXO matches our registration
                        if (datumCardanoPKH === cardanoPKH && dustPKHFromDatum === dustPKH) {
                            const registrationOutRef: OutRef = {
                                txHash: utxo.tx_hash,
                                outputIndex: utxo.output_index,
                            };

                            // Initialize Lucid with Blockfrost using centralized configuration
                            const lucid = await initializeLucidWithBlockfrostClientSide();

                            const registrationUTxO = await lucid.utxosByOutRef([registrationOutRef]);

                            if (!registrationUTxO || registrationUTxO.length === 0) {
                                console.log('[RegistrationUtxo]', '❌ No matching registration UTXO found');
                                return null;
                            }

                            console.log('[RegistrationUtxo]', '✅ Found matching registration UTXO:', toJson(registrationUTxO[0]));
                            return registrationUTxO[0];
                        }
                    }
                } catch (datumError) {
                    console.warn('[RegistrationUtxo]', '⚠️  Failed to deserialize datum for UTXO:', utxo.tx_hash, datumError);
                    continue;
                }
            }

            // If we get here, no matching registration was found
            console.log('[RegistrationUtxo]', '❌ No matching registration UTXO found');
            return null;
        } catch (error) {
            console.error('[RegistrationUtxo]', '❌ Error finding registration UTXO:', error);
            throw error;
        }
    }, [cardanoAddress, dustPKH, isContractsLoaded, contracts]);

    // Method to find registration UTXO (single attempt, updates state)
    const findRegistrationUtxo = useCallback(async () => {
        setIsLoadingRegistrationUtxo(true);
        setRegistrationUtxoError(null);

        try {
            const utxo = await searchRegistrationUtxo();
            setRegistrationUtxo(utxo);
        } catch (error) {
            console.error('[RegistrationUtxo]', '❌ Error finding registration UTXO:', error);
            setRegistrationUtxoError(error instanceof Error ? error.message : 'Failed to find registration UTXO');
            setRegistrationUtxo(null);
        } finally {
            setIsLoadingRegistrationUtxo(false);
        }
    }, [searchRegistrationUtxo]);

    const refetch = async () => {
        if (cardanoAddress && dustPKH && isContractsLoaded) {
            await findRegistrationUtxo();
        }
    };

    // Poll until registration UTXO is found (useful after registration transaction)
    const pollUntilFound = useCallback(async () => {
        const MAX_ATTEMPTS = 20; // Maximum number of polling attempts
        const POLL_INTERVAL = 3000; // 3 seconds between attempts

        console.log('[RegistrationUtxo]', '🔄 Starting polling for registration UTXO...');
        setIsLoadingRegistrationUtxo(true);
        setRegistrationUtxoError(null);

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            console.log('[RegistrationUtxo]', `🔄 Polling attempt ${attempt}/${MAX_ATTEMPTS}`);

            try {
                // Search for the UTXO
                const utxo = await searchRegistrationUtxo();

                // If found, update state and return
                if (utxo) {
                    console.log('[RegistrationUtxo]', '✅ Registration UTXO found after', attempt, 'attempts');
                    setRegistrationUtxo(utxo);
                    setIsLoadingRegistrationUtxo(false);
                    return;
                }

                // Wait before next attempt (except on last attempt)
                if (attempt < MAX_ATTEMPTS) {
                    console.log('[RegistrationUtxo]', `⏳ Waiting ${POLL_INTERVAL/1000}s before next attempt...`);
                    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
                }
            } catch (error) {
                console.error('[RegistrationUtxo]', '❌ Error during polling attempt', attempt, error);

                // Continue trying unless it's the last attempt
                if (attempt < MAX_ATTEMPTS) {
                    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
                }
            }
        }

        // All attempts exhausted
        console.log('[RegistrationUtxo]', '❌ Registration UTXO not found after', MAX_ATTEMPTS, 'attempts');
        setRegistrationUtxoError('Registration UTXO not found after polling. The transaction may still be pending on the blockchain. Please wait a moment and refresh the page.');
        setIsLoadingRegistrationUtxo(false);
    }, [searchRegistrationUtxo]);

    useEffect(() => {
        const fetchKey = `${cardanoAddress}-${dustPKH}-${isContractsLoaded}`;

        if (cardanoAddress && dustPKH && isContractsLoaded) {
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
    }, [cardanoAddress, dustPKH, isContractsLoaded, findRegistrationUtxo]);

    return {
        registrationUtxo,
        isLoadingRegistrationUtxo,
        registrationUtxoError,
        refetch,
        pollUntilFound,
    };
}
