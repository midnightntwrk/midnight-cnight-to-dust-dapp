import { useCallback, useEffect, useState } from 'react';
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
}

export function useRegistrationUtxo(cardanoAddress: string | null, dustPKH: string | null): UseRegistrationUtxoReturn {
    const [registrationUtxo, setRegistrationUtxo] = useState<UTxO | null>(null);
    const [isLoadingRegistrationUtxo, setIsLoadingRegistrationUtxo] = useState(false);
    const [registrationUtxoError, setRegistrationUtxoError] = useState<string | null>(null);

    // Get contracts from DUST protocol context
    const { contracts, isContractsLoaded } = useDustProtocol();

    // Method to find registration UTXO in the DUST Mapping Validator
    const findRegistrationUtxo = useCallback(async () => {
        setIsLoadingRegistrationUtxo(true);
        setRegistrationUtxoError(null);

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
                setRegistrationUtxo(null);
                return;
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
                                setRegistrationUtxo(null);
                                return;
                            }

                            console.log('[RegistrationUtxo]', '✅ Found matching registration UTXO:', toJson(registrationUTxO[0]));
                            setRegistrationUtxo(registrationUTxO[0]);
                            return;
                        }
                    }
                } catch (datumError) {
                    console.warn('[RegistrationUtxo]', '⚠️  Failed to deserialize datum for UTXO:', utxo.tx_hash, datumError);
                    continue;
                }
            }

            // If we get here, no matching registration was found
            console.log('[RegistrationUtxo]', '❌ No matching registration UTXO found');
            setRegistrationUtxo(null);
        } catch (error) {
            console.error('[RegistrationUtxo]', '❌ Error finding registration UTXO:', error);
            setRegistrationUtxoError(error instanceof Error ? error.message : 'Failed to find registration UTXO');
            setRegistrationUtxo(null);
        } finally {
            setIsLoadingRegistrationUtxo(false);
        }
    }, [cardanoAddress, dustPKH, isContractsLoaded, contracts]);

    const refetch = async () => {
        if (cardanoAddress && dustPKH && isContractsLoaded) {
            await findRegistrationUtxo();
        }
    };

    useEffect(() => {
        if (cardanoAddress && dustPKH && isContractsLoaded) {
            findRegistrationUtxo();
        } else {
            setRegistrationUtxo(null);
            setRegistrationUtxoError(null);
            setIsLoadingRegistrationUtxo(false);
        }
    }, [cardanoAddress, dustPKH, findRegistrationUtxo, isContractsLoaded, contracts]);

    return {
        registrationUtxo,
        isLoadingRegistrationUtxo,
        registrationUtxoError,
        refetch,
    };
}
