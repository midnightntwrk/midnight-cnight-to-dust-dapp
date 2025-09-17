/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { getCardanoScanUrl } from '@/config/network';

import { useState } from 'react';
import { getAddressDetails, LucidEvolution, mintingPolicyToId, toHex } from '@lucid-evolution/lucid';
import contractService from '@/services/contractService';

interface SetupActionsProps {
    lucid: LucidEvolution | null;
    contracts: Record<string, string>;
    setupStep: number;
    onStepComplete: () => void;
    onTransactionComplete?: (step: number, txHash: string) => void;
}

export function toJson(value: any, replacer?: (this: any, key: string, value: any) => any, space?: string | number): string {
    return JSON.stringify(
        value,
        function (this: any, key, val) {
            if (typeof val === 'bigint') return val.toString();
            return replacer ? replacer.call(this, key, val) : val;
        },
        space
    );
}

export default function SetupActions({ lucid, contracts, setupStep, onStepComplete, onTransactionComplete }: SetupActionsProps) {
    const [loading, setLoading] = useState(false);
    const [txHash, setTxHash] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [waitingForConfirmation, setWaitingForConfirmation] = useState(false);
    const [confirmationProgress, setConfirmationProgress] = useState(0);

    // Poll for transaction confirmation
    const pollTransactionConfirmation = async (txHash: string) => {
        if (!lucid) return;

        setWaitingForConfirmation(true);
        setConfirmationProgress(0);

        const maxAttempts = 60; // 10 minutes max (10s intervals)
        let attempts = 0;

        const pollInterval = setInterval(async () => {
            try {
                attempts++;
                setConfirmationProgress((attempts / maxAttempts) * 100);

                console.log(`⏳ Checking transaction confirmation and UTxOs... [${attempts}/${maxAttempts}]`);

                // Strategy 1: Try awaitTx but don't rely on it alone
                try {
                    const txInfo = await lucid.awaitTx(txHash, 3000);
                    if (txInfo) {
                        console.log('📋 lucid.awaitTx() reports transaction confirmed');
                    }
                } catch {
                    console.log('⏳ lucid.awaitTx() still waiting...');
                }

                // Strategy 2: Check if UTxOs are actually available (more reliable)
                try {
                    const contractService = (await import('@/services/contractService')).default;
                    const versionOracleContract = contractService.getContract('version-oracle-validator.plutus');
                    if (versionOracleContract?.address) {
                        const utxos = await lucid.utxosAt(versionOracleContract.address);
                        console.log(`🔍 Found ${utxos.length} UTxOs at Version Oracle address`);

                        if (utxos.length > 0) {
                            console.log('✅ UTxOs confirmed available! Transaction fully processed.');
                            clearInterval(pollInterval);
                            setWaitingForConfirmation(false);
                            setConfirmationProgress(100);
                            onStepComplete();
                            return;
                        }
                    }
                } catch {
                    console.log('⏳ UTxOs not yet available, continuing to poll...');
                }

                // Continue polling if neither confirmation method succeeded
                if (attempts >= maxAttempts) {
                    console.log('⚠️ Transaction confirmation timeout reached');
                    clearInterval(pollInterval);
                    setWaitingForConfirmation(false);
                    setError('Transaction confirmation timeout. UTxOs not detected. Please refresh and check manually.');
                }
            } catch (err) {
                console.log('⚠️ Error during polling:', err);
                if (attempts >= maxAttempts) {
                    clearInterval(pollInterval);
                    setWaitingForConfirmation(false);
                    setError('Polling error occurred. Please refresh and check manually.');
                }
            }
        }, 15000); // Check every 15 seconds (longer interval since we're doing more work)
    };

    // Execute transaction with actual Lucid Evolution implementation
    const executeTransaction = async (step: 'step01' | 'step02' | 'step03') => {
        try {
            console.log(`🚀 Starting transaction execution: ${step}`);
            setLoading(true);
            setError('');
            setTxHash('');

            if (!lucid) {
                console.error('❌ Lucid not initialized for transaction');
                throw new Error('Lucid not initialized');
            }

            console.log(`📋 Transaction setup:`, {
                step,
                contractsLoaded: Object.keys(contracts).length,
                availableContracts: Object.keys(contracts),
                lucidConnected: !!lucid,
                walletConnected: !!lucid.wallet,
            });

            let tx;

            switch (step) {
                case 'step01':
                    console.log('🔧 Building Step 01 transaction...');
                    tx = await buildStep01Transaction(lucid);
                    break;
                case 'step02':
                    console.log('🔧 Building Step 02 transaction...');
                    tx = await buildStep02Transaction(lucid);
                    break;
                case 'step03':
                    console.log('🔧 Building Step 03 transaction...');
                    tx = await buildStep03Transaction(lucid);
                    break;
                default:
                    throw new Error(`Unknown step: ${step}`);
            }

            console.log('✅ Transaction built successfully, now signing...');

            // Sign and submit the transaction
            console.log('✍️ Signing transaction with wallet...');
            const signedTx = await tx.sign.withWallet().complete();

            console.log('📤 Submitting signed transaction...');
            const txHash = await signedTx.submit();

            console.log('✅ Transaction submitted successfully:', {
                txHash,
                step,
            });

            setTxHash(txHash);
            
            // Call the callback to store the transaction hash
            if (onTransactionComplete) {
                const stepNumber = parseInt(step.replace('step', ''));
                onTransactionComplete(stepNumber, txHash);
            }

            // Start polling for confirmation
            console.log('🔄 Starting transaction confirmation polling...');
            await pollTransactionConfirmation(txHash);
        } catch (err: unknown) {
            console.error('❌ Transaction failed:', err);

            // Enhanced error logging
            if (err && typeof err === 'object') {
                console.error('📊 Detailed error information:', {
                    error: err,
                    errorString: JSON.stringify(err, null, 2),
                    errorType: typeof err,
                    errorConstructor: err.constructor?.name,
                    errorKeys: Object.keys(err as object),
                });

                // Check for specific error patterns
                const errorStr = JSON.stringify(err);
                if (errorStr.includes('MISSING_SCRIPT')) {
                    console.error('🔍 MISSING_SCRIPT Error Details:');
                    console.error('This error occurs when a script referenced in the transaction is not attached.');
                    console.error('Script hashes in error:', errorStr.match(/[0-9a-f]{56}/g) || 'None found');
                }
            }

            setError(err instanceof Error ? err.message : JSON.stringify(err));
        } finally {
            setLoading(false);
            console.log('🏁 Transaction execution completed');
        }
    };

    const getActionButton = () => {
        console.log('🎯 Current setupStep value:', setupStep);
        switch (setupStep) {
            case 1:
                return (
                    <button
                        onClick={() => executeTransaction('step01')}
                        disabled={loading || !lucid}
                        className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Building Transaction...
                            </>
                        ) : (
                            'Execute Step 01: Initialize Versioning System'
                        )}
                    </button>
                );
            case 2:
                return (
                    <button
                        onClick={() => executeTransaction('step02')}
                        disabled={loading || !lucid}
                        className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-gray-500 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Building Transaction...
                            </>
                        ) : (
                            'Execute Step 02: Initialize DUST Production'
                        )}
                    </button>
                );
            case 3:
                return (
                    <button
                        onClick={() => executeTransaction('step03')}
                        disabled={loading || !lucid}
                        className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-500 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Building Transaction...
                            </>
                        ) : (
                            'Execute Step 03: Register Midnight DUST Address'
                        )}
                    </button>
                );
            case 4:
                return (
                    <div className="text-center p-6 bg-green-500/20 border border-green-400 rounded-lg">
                        <h3 className="text-xl font-bold text-green-200 mb-2">✅ Setup Complete!</h3>
                        <p className="text-green-300 mb-4">The DUST system is now ready for user registrations.</p>
                        <p className="text-green-300 text-sm">You can now proceed to the main application to register users.</p>
                    </div>
                );
            default:
                return null;
        }
    };

    // Build Step 01 transaction: Initialize Version Oracle UTxO
    const buildStep01Transaction = async (lucid: LucidEvolution) => {
        // Import Data for proper datum serialization
        const { Data, Constr } = await import('@lucid-evolution/lucid');

        console.log('🔧 Building Step 01 Transaction (Version Oracle Initialization)...');

        const genesisUtxoTxId = process.env.NEXT_PUBLIC_GENESIS_UTXO_TX_ID;
        const genesisUtxoIndex = parseInt(process.env.NEXT_PUBLIC_GENESIS_UTXO_INDEX || '0');

        console.log('📋 Environment Configuration:', {
            genesisUtxoTxId,
            genesisUtxoIndex,
            hasGenesisUtxoTxId: !!genesisUtxoTxId,
        });

        if (!genesisUtxoTxId) {
            console.error('❌ Genesis UTxO transaction ID not configured');
            throw new Error('Genesis UTxO transaction ID not configured');
        }

        // Get contracts from centralized service
        console.log('🔍 Getting contracts from centralized service...');
        const versionOracleValidatorContract = contractService.getContract('version-oracle-validator.plutus');
        const versionOraclePolicyContract = contractService.getContract('version-oracle-policy.plutus');
        const governancePolicyContract = contractService.getContract('governance-multisig-policy.plutus');

        if (!versionOracleValidatorContract || !versionOraclePolicyContract || !governancePolicyContract) {
            console.error('❌ Contracts not found in service registry');
            throw new Error('Contracts not found in service registry');
        }

        // TokenName debe ser ByteString en hex format para serialización
        const versionOracleTokenNameText = '1';
        const versionOracleTokenName = toHex(new TextEncoder().encode(versionOracleTokenNameText));
        const versionOracleAssetName = versionOraclePolicyContract.policyId + versionOracleTokenName;

        // Query the genesis UTxO
        console.log('🔍 Querying genesis UTxO...');
        const utxoRef = {
            txHash: genesisUtxoTxId,
            outputIndex: genesisUtxoIndex,
        };

        console.log('📍 UTxO Reference:', utxoRef);
        const genesisUtxos = await lucid.utxosByOutRef([utxoRef]);

        console.log('💰 Genesis UTxO Query Result:', {
            utxosFound: genesisUtxos.length,
            utxos: genesisUtxos.map((utxo) => ({
                txHash: utxo.txHash,
                outputIndex: utxo.outputIndex,
                assets: Object.keys(utxo.assets),
                lovelace: utxo.assets.lovelace,
                datum: utxo.datum,
                datumHash: utxo.datumHash,
                scriptRef: utxo.scriptRef,
            })),
        });

        if (genesisUtxos.length === 0) {
            console.error('❌ Genesis UTxO not found');
            throw new Error('Genesis UTxO not found');
        }

        // Build the transaction according to Step 01 specification
        console.log('🔨 Building Step 01 transaction...');
        const txBuilder = lucid.newTx();

        // INPUT: Genesis UTxO (consumed)
        console.log('📥 Adding collectFrom (Genesis UTxO)...');
        txBuilder.collectFrom(genesisUtxos);

        // MINT: Version Oracle Policy + 1 token

        const initializeVersionOracleRedeemerData = {
            versionOracle: 1n, // VersionOracle { scriptId = 1 } - DEBE SER 1 SEGÚN TX EXITOSA
            scriptHash: governancePolicyContract.scriptHash!, // ScriptHash del GOVERNANCE MULTISIG SCRIPT (no versionOraclePolicyId)
            tokenName: '31', // TokenName: "Governance Policy" = 'Governance Policy'
        };
        const initializeVersionOracleRedeemer = Data.to(
            new Constr(0, [
                initializeVersionOracleRedeemerData.versionOracle, // VersionOracle { scriptId = 1 } - DEBE SER 1 SEGÚN TX EXITOSA
                initializeVersionOracleRedeemerData.scriptHash, // ScriptHash del GOVERNANCE MULTISIG SCRIPT (no versionOraclePolicyId)
                initializeVersionOracleRedeemerData.tokenName, // TokenName: "Governance Policy" = 'Governance Policy'
            ])
        );

        console.log('🪙 Minting Version Oracle token:', {
            assetName: versionOracleAssetName,
            amount: 1n,
            redeemerData: initializeVersionOracleRedeemerData,
            redeemerCBORHEX: initializeVersionOracleRedeemer,
        });

        txBuilder.mintAssets({ [versionOracleAssetName]: 1n }, initializeVersionOracleRedeemer);

        // OUTPUT: Version Oracle Validator Address + VersionOracleConfig datum + Version Oracle Token
        // Create VersionOracleDatum structure - DEBE SER LISTA SIMPLE SEGÚN TX EXITOSA: [1, policyId]
        const versionOracleDatumData = [
            1n, // VersionOracle scriptId = 1 - DEBE SER 1 SEGÚN TX EXITOSA
            versionOraclePolicyContract.policyId!, // CurrencySymbol of Version Oracle Policy
        ];

        // Serialize as simple list (no schema needed)
        const serializedVersionOracleDatum = Data.to(versionOracleDatumData);

        console.log('📤 Creating output to Version Oracle Validator:', {
            address: versionOracleValidatorContract.address!,
            assets: { lovelace: 5000000n, [versionOracleAssetName]: 1n },
            datumData: versionOracleDatumData,
            datumCBORHEX: serializedVersionOracleDatum,
            governancePolicyScriptHash: governancePolicyContract.scriptHash!,
        });

        txBuilder.pay.ToContract(
            versionOracleValidatorContract.address!, // Version Oracle Validator Address (según doc)
            { kind: 'inline', value: serializedVersionOracleDatum }, // VersionOracleDatum (INLINE)
            {
                lovelace: 5000000n, // MinADA
                [versionOracleAssetName]: 1n, // Version Oracle Token (1x)
            },
            governancePolicyContract.scriptObject! // GOVERNANCE MULTISIG POLICY SCRIPT (reference script)
        );

        // PRODUCTION: Attach Version Oracle Policy script before completing
        console.log('📎 Attaching Version Oracle Policy script...');
        txBuilder.attach.MintingPolicy(versionOraclePolicyContract.scriptObject!);

        console.log('🔧 Completing Step 01 transaction...');
        const completedTx = await txBuilder.complete();

        console.log('✅ Step 01 Transaction completed successfully');
        return completedTx;
    };

    // Build Step 02 transaction: Initialize DUST Production System
    const buildStep02Transaction = async (lucid: LucidEvolution) => {
        const { Data, Constr } = await import('@lucid-evolution/lucid');

        console.log('🔧 Building Step 02 Transaction (DUST Production System Initialization)...');

        // Get contracts from centralized service
        console.log('🔍 Getting contracts from centralized service...');
        const versionOracleValidatorContract = contractService.getContract('version-oracle-validator.plutus');
        const versionOraclePolicyContract = contractService.getContract('version-oracle-policy.plutus');
        const governancePolicyContract = contractService.getContract('governance-multisig-policy.plutus');
        const authTokenMintingPolicyContract = contractService.getContract('dust-auth-token-minting-policy.plutus');
        const authTokenBurningPolicyContract = contractService.getContract('dust-auth-token-burning-policy.plutus');
        const mappingSpendPolicyContract = contractService.getContract('dust-mapping-validator-spend-policy.plutus');

        if (
            !versionOracleValidatorContract ||
            !versionOraclePolicyContract ||
            !governancePolicyContract ||
            !authTokenMintingPolicyContract ||
            !authTokenBurningPolicyContract ||
            !mappingSpendPolicyContract
        ) {
            console.error('❌ Contracts not found in service registry');
            throw new Error('Contracts not found in service registry');
        }

        // Find Version Oracle UTxO from Step 01 (reference input)
        console.log('🔍 Querying Version Oracle UTxO from Step 01...');
        const versionOracleUtxos = await lucid.utxosAt(versionOracleValidatorContract.address!);

        console.log(
            '💰 Version Oracle UTxO Query Result:',
            toJson({
                utxosFound: versionOracleUtxos.length,
                utxos: versionOracleUtxos.map((utxo) => ({
                    txHash: utxo.txHash,
                    outputIndex: utxo.outputIndex,
                    assets: Object.keys(utxo.assets),
                    lovelace: utxo.assets.lovelace,
                    datum: utxo.datum,
                    datumHash: utxo.datumHash,
                    scriptRef: utxo.scriptRef,
                })),
            })
        );

        if (versionOracleUtxos.length === 0) {
            console.error('❌ Version Oracle UTxO not found');
            throw new Error('Version Oracle UTxO from Step 01 not found - run Step 01 first');
        }

        // Build the transaction according to Step 02 specification
        console.log('🔨 Building Step 02 transaction...');
        const txBuilder = lucid.newTx();

        // REFERENCE INPUT: Version Oracle UTxO (from Step 01)
        console.log('📥 Adding reference input (Version Oracle UTxO)...');
        txBuilder.readFrom([versionOracleUtxos[0]]);

        // MINT: Version Oracle Policy + 3 tokens (según CLI exitoso)
        // TokenNames en hex: "32", "33", "34" (representan scriptIds 2, 3, 4)
        const tokenNames = ['32', '33', '34']; // hex values
        const scriptIds = [2n, 3n, 4n]; // corresponding script IDs
        const referenceScripts = [authTokenMintingPolicyContract, authTokenBurningPolicyContract, mappingSpendPolicyContract];

        console.log(
            '🪙 Minting 3 Version Oracle tokens:',
            toJson({
                policyId: versionOraclePolicyContract.policyId!,
                tokenNames: tokenNames,
                scriptIds: scriptIds,
            })
        );

        // Redeemer para Version Oracle Policy (constructor 1, según CLI exitoso)
        const versionOracleRedeemerData = {
            scriptId: 2n, // Script ID for first token (Minting Policy)
            scriptHash: authTokenMintingPolicyContract.scriptHash!, // ScriptHash del MINTING POLICY
            tokenName: '32', // TokenName en hex
        };
        const versionOracleRedeemer = Data.to(
            new Constr(1, [
                // Constructor 1 (según CLI exitoso)
                versionOracleRedeemerData.scriptId,
                versionOracleRedeemerData.scriptHash,
                versionOracleRedeemerData.tokenName,
            ])
        );

        console.log(
            '🪙 Version Oracle minting redeemer:',
            toJson({
                constructor: 1,
                redeemerData: versionOracleRedeemerData,
                redeemerCBORHEX: versionOracleRedeemer,
            })
        );

        // Mint 3 tokens with Version Oracle Policy
        const mintAssets: Record<string, bigint> = {};
        tokenNames.forEach((tokenName) => {
            const assetName = versionOraclePolicyContract.policyId! + tokenName;
            mintAssets[assetName] = 1n;
            txBuilder.mintAssets({ [assetName]: 1n }, versionOracleRedeemer);
        });

        // Redeemer para Governance Policy (constructor 0, empty, según CLI exitoso)
        const governanceRedeemer = Data.to(new Constr(0, [])); // Constructor 0, empty fields

        console.log(
            '🪙 Governance minting redeemer:',
            toJson({
                constructor: 0,
                fields: 'empty',
                redeemerCBORHEX: governanceRedeemer,
            })
        );

        // Mint 1 Governance token
        const governanceTokenName = toHex(new TextEncoder().encode('Governance approval'));
        const governanceAssetName = governancePolicyContract.policyId! + governanceTokenName;

        txBuilder.mintAssets({ [governanceAssetName]: 1n }, governanceRedeemer);

        // OUTPUTS: 3 outputs to Version Oracle Validator + ScriptDatum + Reference Scripts
        console.log('📤 Creating 3 outputs to Version Oracle Validator...');

        tokenNames.forEach((tokenName, index) => {
            const assetName = versionOraclePolicyContract.policyId! + tokenName;
            const scriptId = scriptIds[index];
            const referenceScript = referenceScripts[index];

            // Create ScriptDatum structure según CLI exitoso: [scriptId, versionOraclePolicyId]
            const scriptDatumData = [
                scriptId, // Script ID (2, 3, 4)
                versionOraclePolicyContract.policyId!, // Version Oracle Policy ID
            ];

            const serializedScriptDatum = Data.to(scriptDatumData);

            console.log(
                `📤 Creating output ${index + 1} to Version Oracle Validator:`,
                toJson({
                    address: versionOracleValidatorContract.address!,
                    assets: { lovelace: index === 0 ? 9770770n : index === 1 ? 1465400n : 14326440n, [assetName]: 1n },
                    datumData: scriptDatumData,
                    datumCBORHEX: serializedScriptDatum,
                    referenceScript: referenceScript.scriptHash!,
                })
            );

            // ADA amounts según CLI exitoso
            const adaAmounts = [9770770n, 1465400n, 14326440n];

            txBuilder.pay.ToContract(
                versionOracleValidatorContract.address!, // Version Oracle Validator Address
                { kind: 'inline', value: serializedScriptDatum }, // ScriptDatum (INLINE)
                {
                    lovelace: adaAmounts[index], // ADA según CLI exitoso
                    [assetName]: 1n, // Version Oracle Token (1x)
                },
                referenceScript.scriptObject! // Reference script
            );
        });

        // PRODUCTION: Attach scripts before completing
        console.log('📎 Attaching Version Oracle Policy script...');
        txBuilder.attach.MintingPolicy(versionOraclePolicyContract.scriptObject!);

        console.log('📎 Attaching Governance Policy script...');
        txBuilder.attach.MintingPolicy(governancePolicyContract.scriptObject!);

        console.log('🔧 Adding Governance Signature');
        txBuilder.addSigner(await lucid.wallet().address());

        console.log('🔧 Completing Step 02 transaction...');
        const completedTx = await txBuilder.complete();

        console.log('✅ Step 02 Transaction completed successfully');
        return completedTx;
    };

    // Build Step 03 transaction: Register DUST Address
    const buildStep03Transaction = async (lucid: LucidEvolution) => {
        const { Data, Constr } = await import('@lucid-evolution/lucid');

        console.log('🔧 Building Step 03 Transaction (DUST Address Registration)...');

        // Get contracts from centralized service
        console.log('🔍 Getting contracts from centralized service...');
        const versionOracleValidatorContract = contractService.getContract('version-oracle-validator.plutus');
        const dustAuthTokenMintingPolicyContract = contractService.getContract('dust-auth-token-minting-policy.plutus');
        const dustAuthTokenPolicyContract = contractService.getContract('dust-auth-token-policy.plutus');
        const dustMappingValidatorContract = contractService.getContract('dust-mapping-validator.plutus');

        if (!versionOracleValidatorContract || !dustAuthTokenMintingPolicyContract || !dustAuthTokenPolicyContract || !dustMappingValidatorContract) {
            console.error('❌ Required contracts not found in service registry');
            throw new Error('Required contracts not found in service registry');
        }

        // Find Version Oracle UTxO (reference input)
        console.log('🔍 Querying Version Oracle UTxOs for reference...');
        const versionOracleUtxos = await lucid.utxosAt(versionOracleValidatorContract.address!);

        console.log(
            '💰 Version Oracle UTxO Query Result:',
            toJson({
                utxosFound: versionOracleUtxos.length,
                utxos: versionOracleUtxos.map((utxo) => ({
                    txHash: utxo.txHash,
                    outputIndex: utxo.outputIndex,
                    assets: Object.keys(utxo.assets),
                    lovelace: utxo.assets.lovelace,
                    datum: utxo.datum,
                    datumHash: utxo.datumHash,
                    scriptRef: utxo.scriptRef?.script.slice(0, 10) + '...',
                })),
            })
        );

        if (versionOracleUtxos.length === 0) {
            console.error('❌ Version Oracle UTxOs not found');
            throw new Error('Version Oracle UTxOs from previous steps not found - run Steps 01 & 02 first');
        }

        // Find the UTxO with the DUST Auth Token Minting Policy reference script (script hash: 2be98752...)
        const dustAuthTokenMintingUtxo = versionOracleUtxos.find((utxo) => {
            if (!utxo.scriptRef) {
                return false;
            }
            return mintingPolicyToId(utxo.scriptRef) === dustAuthTokenMintingPolicyContract.policyId;
        });

        if (!dustAuthTokenMintingUtxo) {
            console.error('❌ DUST Auth Token Minting Policy UTxO not found');
            throw new Error('DUST Auth Token Minting Policy UTxO not found');
        }

        // Get environment variables for registration
        const cardanoAddress = await lucid.wallet().address();
        const cardanoPKH = getAddressDetails(cardanoAddress)?.paymentCredential?.hash;
        const dustPKH = process.env.NEXT_PUBLIC_MIDNIGHT_DUST_PKH;

        console.log('📋 Registration Configuration:', {
            dustPKH,
            cardanoAddress,
            hasCardanoAddress: !!cardanoAddress,
            hasDustPKH: !!dustPKH,
        });

        if (!dustPKH) {
            console.error('❌ DUST PKH not configured');
            throw new Error('DUST_PKH must be configured in environment');
        }

        // Build the transaction according to Step 03 specification
        console.log('🔨 Building Step 03 (Registration) transaction...');
        const txBuilder = lucid.newTx();

        // REFERENCE INPUT: Version Oracle UTxO with DUST Auth Token Minting Policy
        console.log('📥 Adding reference input (Version Oracle UTxO with minting policy)...');
        txBuilder.readFrom([dustAuthTokenMintingUtxo]);

        // MINT 1: DUST Auth Token Minting Policy - 1 token with EMPTY asset name (nilAssetName in CLI)
        const dustAuthTokenMintingRedeemer = Data.to(new Constr(0, [])); // Constructor 0, empty fields
        // CLI uses Utils.nilAssetName which means empty asset name, just the policy ID
        const dustAuthTokenMintingAssetName = dustAuthTokenMintingPolicyContract.policyId! + '';

        console.log(
            '🪙 Minting DUST Auth Token (Minting Policy):',
            toJson({
                policyId: dustAuthTokenMintingPolicyContract.policyId!,
                assetName: dustAuthTokenMintingAssetName,
                amount: 1n,
                redeemerCBORHEX: dustAuthTokenMintingRedeemer,
            })
        );

        txBuilder.mintAssets({ [dustAuthTokenMintingAssetName]: 1n }, dustAuthTokenMintingRedeemer);

        // MINT 2: DUST Auth Token Policy - 1 token with specific token name (según blockchain data)
        const dustAuthTokenRedeemer = Data.to(new Constr(0, [])); // Constructor 0, empty fields
        const dustTokenName = toHex(new TextEncoder().encode('DUST production auth token'));
        const dustAuthTokenAssetName = dustAuthTokenPolicyContract.policyId! + dustTokenName;

        console.log(
            '🪙 Minting DUST Auth Token (Main Policy):',
            toJson({
                policyId: dustAuthTokenPolicyContract.policyId!,
                tokenName: 'DUST production auth token',
                assetName: dustAuthTokenAssetName,
                amount: 1n,
            })
        );

        txBuilder.mintAssets({ [dustAuthTokenAssetName]: 1n }, dustAuthTokenRedeemer);

        // OUTPUT: DUST Mapping Validator with Registration Datum
        // Based on CLI successful transaction datum structure - exactly matching CLI format
        // The CLI encodes the DUST PKH as the bytes of the hex string representation, not the hex bytes directly
        const registrationDatumData = new Constr(0, [
            cardanoPKH!, // Cardano PKH (28 bytes hex string)
            toHex(new TextEncoder().encode(dustPKH)), // DUST PKH encoded as bytes of the string representation (exactly as CLI)
        ]);

        const serializedRegistrationDatum = Data.to(registrationDatumData);

        console.log(
            '📤 Creating output to DUST Mapping Validator:',
            toJson({
                address: dustMappingValidatorContract.address!,
                assets: {
                    lovelace: 1586080n, // ADA amount según blockchain data
                    [dustAuthTokenAssetName]: 1n, // Using minting policy token, not main policy token
                },
                datumData: registrationDatumData,
                datumCBORHEX: serializedRegistrationDatum,
            })
        );

        txBuilder.pay.ToContract(
            dustMappingValidatorContract.address!, // DUST Mapping Validator Address
            { kind: 'inline', value: serializedRegistrationDatum }, // Registration Datum (INLINE)
            {
                lovelace: 1586080n, // MinADA según blockchain data
                [dustAuthTokenAssetName]: 1n, // DUST Auth Token from Minting Policy (not main policy)
            }
        );

        // PRODUCTION: Attach minting policy scripts before completing
        console.log('📎 Attaching DUST Auth Token Minting Policy script...');
        txBuilder.attach.MintingPolicy(dustAuthTokenMintingPolicyContract.scriptObject!);

        console.log('📎 Attaching DUST Auth Token Policy script...');
        txBuilder.attach.MintingPolicy(dustAuthTokenPolicyContract.scriptObject!);

        console.log('🔧 Adding Wallet Signature');
        txBuilder.addSigner(await lucid.wallet().address());

        console.log('🔧 Completing Step 03 transaction...');
        const completedTx = await txBuilder.complete();

        console.log('✅ Step 03 Transaction completed successfully');
        return completedTx;
    };

    return (
        <div className="bg-white/5 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Setup Actions</h2>

            {error && (
                <div className="mb-4 p-4 bg-red-500/20 border border-red-400 rounded-lg">
                    <h4 className="font-semibold text-red-200 mb-2">Transaction Error</h4>
                    <p className="text-red-300 text-sm font-mono">{error}</p>
                </div>
            )}

            {txHash && (
                <div className="mb-4 p-4 bg-green-500/20 border border-green-400 rounded-lg">
                    <h4 className="font-semibold text-green-200 mb-2">{waitingForConfirmation ? 'Transaction Submitted - Waiting for Confirmation' : 'Transaction Submitted'}</h4>
                    <p className="text-green-300 text-sm">
                        <span className="block mb-1">Hash:</span>
                        <span className="font-mono break-all">{txHash}</span>
                    </p>
                    <a
                        href={getCardanoScanUrl('transaction', txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-400 hover:text-green-300 text-sm underline"
                    >
                        View on CardanoScan →
                    </a>

                    {waitingForConfirmation && (
                        <div className="mt-3">
                            <div className="flex items-center justify-between text-xs text-green-300 mb-1">
                                <span>Checking confirmation...</span>
                                <span>{Math.round(confirmationProgress)}%</span>
                            </div>
                            <div className="w-full bg-green-900/30 rounded-full h-2">
                                <div className="bg-green-400 h-2 rounded-full transition-all duration-300" style={{ width: `${confirmationProgress}%` }}></div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="space-y-4">
                {!waitingForConfirmation && getActionButton()}
            </div>
        </div>
    );
}
