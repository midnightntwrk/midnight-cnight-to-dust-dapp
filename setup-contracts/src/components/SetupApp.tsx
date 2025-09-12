'use client';

import { useState, useEffect, useRef } from 'react';
import WalletConnection from '@/components/WalletConnection';
import SetupStatus from '@/components/SetupStatus';
import SetupActions from '@/components/SetupActions';
import { Blockfrost, getAddressDetails, Lucid, LucidEvolution, WalletApi } from '@lucid-evolution/lucid';
import contractService, { ContractsRegistry } from '@/services/contractService';
import { BLOCKFROST_URL, BLOCKFROST_KEY, getLucidNetwork } from '@/config/network';
import InfoSection from './InfoSection';

export default function SetupApp() {
    const [lucid, setLucid] = useState<LucidEvolution | null>(null);
    const [walletAddress, setWalletAddress] = useState<string>('');
    const [walletPKH, setWalletPKH] = useState<string>('');
    const [setupStep, setSetupStep] = useState<number>(0);
    const [loading, setLoading] = useState(false);
    const [contracts, setContracts] = useState<Record<string, string>>({});
    const [contractsRegistry, setContractsRegistry] = useState<ContractsRegistry>({});
    const [lucidInitialized, setLucidInitialized] = useState(false);
    const [txHashes, setTxHashes] = useState<Record<number, string>>({});

    // Refs to prevent duplicate executions in React Strict Mode
    const contractsLoadedRef = useRef(false);
    const lucidInitializedRef = useRef(false);

    // Load smart contracts on component mount using centralized service
    useEffect(() => {
        // Prevent duplicate loading in React Strict Mode
        if (contractsLoadedRef.current) {
            console.log('🔄 Contracts already loaded, skipping duplicate execution');
            return;
        }

        const loadContracts = async () => {
            try {
                contractsLoadedRef.current = true;
                console.log('🚀 Loading contracts using centralized contract service...');

                // Load all contracts and get comprehensive information
                const registry = await contractService.loadAllContracts();
                setContractsRegistry(registry);

                // Set legacy contracts format for backward compatibility
                const legacyContracts = contractService.getLegacyContractsFormat();
                setContracts(legacyContracts);

                console.log('✅ Contract loading completed via centralized service:', {
                    totalContracts: contractService.getContractCount(),
                    registryKeys: Object.keys(registry),
                    policyIds: contractService.getAllPolicyIds(),
                    validatorAddresses: contractService.getAllValidatorAddresses(),
                });
            } catch (error) {
                console.error('❌ Failed to load smart contracts via centralized service:', error);
                contractsLoadedRef.current = false; // Reset on error to allow retry
            }
        };

        loadContracts();
    }, []);

    // Initialize Lucid with Blockfrost provider
    useEffect(() => {
        if (typeof window === 'undefined') return; // Skip on server-side
        if (lucidInitialized || lucid || lucidInitializedRef.current) return; // Prevent duplicate initialization

        const initLucid = async () => {
            try {
                lucidInitializedRef.current = true;
                console.log('🔄 Initializing Lucid Evolution...');
                setLucidInitialized(true);

                const blockfrostApiKey = BLOCKFROST_KEY;
                const blockfrostUrl = BLOCKFROST_URL;
                const network = getLucidNetwork();

                console.log('🔧 Environment variables:', {
                    blockfrostApiKey: blockfrostApiKey ? `${blockfrostApiKey.substring(0, 8)}...` : 'undefined',
                    blockfrostUrl,
                    network,
                    debugMode: process.env.NEXT_PUBLIC_DEBUG_MODE,
                });

                if (!blockfrostApiKey || !blockfrostUrl) {
                    console.error('❌ Missing Blockfrost configuration:', {
                        hasApiKey: !!blockfrostApiKey,
                        hasUrl: !!blockfrostUrl,
                    });
                    return;
                }

                console.log('🌐 Creating Blockfrost provider...');
                const provider = new Blockfrost(blockfrostUrl, blockfrostApiKey);

                console.log('🚀 Initializing Lucid instance...');
                const lucidInstance = await Lucid(provider, network);

                setLucid(lucidInstance);
                console.log('✅ Lucid Evolution initialized successfully:', {
                    network: network,
                    provider: 'Blockfrost',
                });
            } catch (error) {
                console.error('❌ Failed to initialize Lucid:', error);
                lucidInitializedRef.current = false; // Reset on error to allow retry
                if (error instanceof Error) {
                    console.error('Error details:', {
                        name: error.name,
                        message: error.message,
                        stack: error.stack,
                    });
                }
            }
        };

        initLucid();
    }, [lucidInitialized, lucid]);

    // Connect wallet and check setup status
    const connectWallet = async (walletApi: WalletApi) => {
        try {
            console.log('🔄 Connecting wallet...');
            setLoading(true);

            if (!lucid) {
                console.error('❌ Lucid not initialized when trying to connect wallet');
                throw new Error('Lucid not initialized');
            }

            console.log('🔗 Selecting wallet API...', { walletApi });

            // Connect wallet using Lucid Evolution API
            lucid.selectWallet.fromAPI(walletApi);

            console.log('📍 Getting wallet address...');
            const address = await lucid.wallet().address();

            const pkh = getAddressDetails(address)?.paymentCredential?.hash;
            // const stakePkh = getAddressDetails(address)?.stakeCredential?.hash;

            console.log('✅ Wallet connected successfully:', {
                address: address.substring(0, 20) + '...',
                fullAddress: address,
            });

            setWalletAddress(address);
            setWalletPKH(pkh ?? '');

            // Check setup status
            console.log('🔍 Checking setup status...');
            await checkSetupStatus(lucid);
        } catch (error) {
            console.error('❌ Failed to connect wallet:', error);
            if (error instanceof Error) {
                console.error('Wallet connection error details:', {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                });
            }
            alert('Failed to connect wallet. Please try again.');
        } finally {
            setLoading(false);
            console.log('🏁 Wallet connection process completed');
        }
    };

    // Check the current setup status
    const checkSetupStatus = async (lucidInstance: LucidEvolution) => {
        try {
            console.log('🔍 Starting setup status check...');

            // Check for Version Oracle UTxO (Step 01 completion)
            console.log('📍 Getting Version Oracle address...');
            const versionOracleAddress = await getVersionOracleAddress();

            console.log('🔎 Fetching UTxOs at Version Oracle address:', versionOracleAddress);
            const versionOracleUtxos = await lucidInstance.utxosAt(versionOracleAddress);

            console.log('💰 Found UTxOs:', {
                count: versionOracleUtxos.length,
                utxos: versionOracleUtxos.map((utxo) => ({
                    txHash: utxo.txHash,
                    outputIndex: utxo.outputIndex,
                    assets: Object.keys(utxo.assets),
                    assetsCount: Object.keys(utxo.assets).length,
                    lovelace: utxo.assets.lovelace,
                })),
            });

            // Get the actual Version Oracle Policy ID from contract service
            const versionOraclePolicyContract = contractService.getContract('version-oracle-policy.plutus');
            const versionOraclePolicyId = versionOraclePolicyContract?.policyId;

            console.log('🔍 Looking for Version Oracle Policy ID:', versionOraclePolicyId);

            const hasVersionOracle = versionOracleUtxos.some((utxo) => {
                // Check if UTxO has Version Oracle Token with the correct policy ID
                const hasOracleAsset = Object.keys(utxo.assets).some((asset) => versionOraclePolicyId && asset.startsWith(versionOraclePolicyId));
                console.log('🔍 Checking UTxO for Version Oracle token:', {
                    txHash: utxo.txHash,
                    assets: Object.keys(utxo.assets),
                    lookingForPolicyId: versionOraclePolicyId,
                    hasOracleAsset,
                });
                return hasOracleAsset;
            });

            console.log('🎯 Version Oracle check result:', { hasVersionOracle });

            if (!hasVersionOracle) {
                console.log('⏭️ Setting setup step to 1 (Step 01 needed)');
                setSetupStep(1); // Step 01 needed
                return;
            }

            // Check for multiple Version Oracle tokens (Step 02 completion)
            console.log('🔢 Checking for multiple Version Oracle tokens (Step 02 completion)...');

            const versionOracleTokens = versionOracleUtxos.filter((utxo) => {
                return Object.keys(utxo.assets).some((asset) => versionOraclePolicyId && asset.startsWith(versionOraclePolicyId));
            });

            console.log('🔍 Version Oracle tokens found:', {
                totalUtxos: versionOracleUtxos.length,
                tokenUtxos: versionOracleTokens.length,
            });

            // Step 02 creates 3 additional Version Oracle tokens, so we should have 4 total (1 from Step 01 + 3 from Step 02)
            if (versionOracleTokens.length < 4) {
                console.log('⏭️ Setting setup step to 2 (Step 02 needed)');
                setSetupStep(2); // Step 02 needed
                return;
            }

            // Check for DUST mapping address registration (Step 03 completion)
            console.log('🌙 Checking for DUST mapping address registration...');

            const dustMappingValidatorContract = contractService.getContract('dust-mapping-validator.plutus');
            if (!dustMappingValidatorContract?.address) {
                console.log('⚠️ DUST mapping validator contract not found, defaulting to Step 03');
                setSetupStep(3);
                return;
            }

            console.log('🔎 Fetching UTxOs at DUST Mapping address:', dustMappingValidatorContract.address);
            const dustMappingUtxos = await lucidInstance.utxosAt(dustMappingValidatorContract.address);

            console.log('💰 DUST Mapping UTxOs found:', {
                count: dustMappingUtxos.length,
                utxos: dustMappingUtxos.map((utxo) => ({
                    txHash: utxo.txHash,
                    outputIndex: utxo.outputIndex,
                    assets: Object.keys(utxo.assets),
                    lovelace: utxo.assets.lovelace,
                })),
            });

            const hasDustMapping = dustMappingUtxos.length > 0;

            if (hasDustMapping) {
                console.log('✅ All setup complete! Setting step to 4');
                setSetupStep(4); // All setup complete
            } else {
                console.log('⏭️ Setting setup step to 3 (Step 03 needed)');
                setSetupStep(3); // Step 03 needed
            }
        } catch (error) {
            console.error('❌ Failed to check setup status:', error);
            if (error instanceof Error) {
                console.error('Setup status error details:', {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                });
            }
            console.log('⚠️ Defaulting to Step 01 due to error');
            setSetupStep(1); // Default to Step 01 if check fails
        }
    };

    // Get Version Oracle Address from centralized contract service
    const getVersionOracleAddress = async () => {
        console.log('📍 Getting Version Oracle address via contract service...');

        const versionOracleContract = contractService.getContract('version-oracle-validator.plutus');
        if (!versionOracleContract) {
            console.error('❌ Version Oracle contract not found in registry');
            console.log('Available contracts:', Object.keys(contractsRegistry));
            throw new Error('Version Oracle contract not found in registry');
        }

        console.log('📜 Version Oracle contract details from registry:', {
            filename: versionOracleContract.filename,
            type: versionOracleContract.type,
            scriptHash: versionOracleContract.scriptHash,
            address: versionOracleContract.address,
            cborLength: versionOracleContract.cborHex.length,
        });

        if (!versionOracleContract.address) {
            console.error('❌ Version Oracle address not computed in registry');
            throw new Error('Version Oracle address not computed in registry');
        }

        console.log('✅ Using computed Version Oracle address:', versionOracleContract.address);
        return versionOracleContract.address;
    };

    return (
        <>
            {!walletAddress ? (
                <WalletConnection onConnect={connectWallet} loading={loading} />
            ) : (
                <div className="space-y-8">
                    <InfoSection walletAddress={walletAddress} walletPKH={walletPKH} />

                    <SetupStatus setupStep={setupStep} txHashes={txHashes} />

                    <SetupActions
                        lucid={lucid}
                        contracts={contracts}
                        setupStep={setupStep}
                        onStepComplete={() => checkSetupStatus(lucid!)}
                        onTransactionComplete={(step, txHash) => {
                            setTxHashes((prev) => ({ ...prev, [step]: txHash }));
                        }}
                    />
                </div>
            )}
        </>
    );
}
