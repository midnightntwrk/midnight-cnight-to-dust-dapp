import { ContractUtils, ContractsRegistry } from './contractUtils';
import { initializeLucidWithBlockfrostClientSide } from '@/config/network';

export interface DustProtocolStatus {
    isReady: boolean;
    currentStep: number;
    InitVersioningCommand: boolean;
    InitDustProductionCommand: boolean;
    error?: string;
}

// Stateless utility class - no singleton, no internal state
export class DustProtocolUtils {
    /**
     * Get the Version Oracle validator address - Pure function
     */
    private static getVersionOracleAddress(contracts: ContractsRegistry): string {
        const versionOracleValidatorContract = ContractUtils.getContract(contracts, 'version-oracle-validator.plutus');
        if (!versionOracleValidatorContract?.address) {
            throw new Error('Version Oracle validator contract not found or address not computed');
        }
        return versionOracleValidatorContract.address;
    }

    /**
     * Check the current dust protocol setup status - Pure function
     * Returns setup step needed: 1 = Step 01 needed, 2 = Step 02 needed, 3 = Ready for registration
     */
    static async checkSetupStatus(contracts: ContractsRegistry): Promise<DustProtocolStatus> {
        try {
            console.log('[DustProtocol]','🔍 Starting dust protocol setup status check...');

            // Check for Version Oracle UTxO (Step 01 completion)
            console.log('[DustProtocol]','📍 Getting Version Oracle address...');
            const versionOracleAddress = DustProtocolUtils.getVersionOracleAddress(contracts);

            // Initialize Lucid with Blockfrost using centralized configuration
            const lucid = await initializeLucidWithBlockfrostClientSide();

            console.log('[DustProtocol]','🔎 Fetching UTxOs at Version Oracle address:', versionOracleAddress);
            const versionOracleUtxos = await lucid.utxosAt(versionOracleAddress);

            console.log('[DustProtocol]','💰 Found UTxOs:', {
                count: versionOracleUtxos.length,
                utxos: versionOracleUtxos.map((utxo) => ({
                    txHash: utxo.txHash,
                    outputIndex: utxo.outputIndex,
                    assets: Object.keys(utxo.assets),
                    assetsCount: Object.keys(utxo.assets).length,
                    lovelace: utxo.assets.lovelace,
                })),
            });

            // Get the actual Version Oracle Policy ID from contracts
            const versionOraclePolicyContract = ContractUtils.getContract(contracts, 'version-oracle-policy.plutus');
            const versionOraclePolicyId = versionOraclePolicyContract?.policyId;

            console.log('[DustProtocol]','🔍 Looking for Version Oracle Policy ID:', versionOraclePolicyId);

            const hasVersionOracle = versionOracleUtxos.some((utxo) => {
                // Check if UTxO has Version Oracle Token with the correct policy ID
                const hasOracleAsset = Object.keys(utxo.assets).some((asset) => versionOraclePolicyId && asset.startsWith(versionOraclePolicyId));
                console.log('[DustProtocol]','🔍 Checking UTxO for Version Oracle token:', {
                    txHash: utxo.txHash,
                    assets: Object.keys(utxo.assets),
                    lookingForPolicyId: versionOraclePolicyId,
                    hasOracleAsset,
                });
                return hasOracleAsset;
            });

            console.log('[DustProtocol]','🎯 Version Oracle check result:', { InitVersioningCommand: hasVersionOracle });

            if (!hasVersionOracle) {
                console.log('[DustProtocol]','⏭️ Setup step 1 needed (InitVersioningCommand not completed)');
                return {
                    isReady: false,
                    currentStep: 1,
                    InitVersioningCommand: false,
                    InitDustProductionCommand: false,
                };
            }

            // Check for multiple Version Oracle tokens (Step 02 completion)
            console.log('[DustProtocol]','🔢 Checking for multiple Version Oracle tokens (Step 02 completion)...');

            const versionOracleTokens = versionOracleUtxos.filter((utxo) => {
                return Object.keys(utxo.assets).some((asset) => versionOraclePolicyId && asset.startsWith(versionOraclePolicyId));
            });

            console.log('[DustProtocol]','🔍 Version Oracle tokens found:', {
                totalUtxos: versionOracleUtxos.length,
                tokenUtxos: versionOracleTokens.length,
            });

            // Step 02 creates 3 additional Version Oracle tokens, so we should have 4 total (1 from Step 01 + 3 from Step 02)
            const hasMultipleVersionOracleTokens = versionOracleTokens.length >= 4;

            if (!hasMultipleVersionOracleTokens) {
                console.log('[DustProtocol]','⏭️ Setup step 2 needed (InitDustProductionCommand not completed)');
                return {
                    isReady: false,
                    currentStep: 2,
                    InitVersioningCommand: true,
                    InitDustProductionCommand: false,
                };
            }

            // Both steps completed - ready for registration
            console.log('[DustProtocol]','✅ Dust protocol is ready for user registration (InitVersioningCommand & InitDustProductionCommand completed)');
            return {
                isReady: true,
                currentStep: 3,
                InitVersioningCommand: true,
                InitDustProductionCommand: true,
            };
        } catch (error) {
            console.error('[DustProtocol]','❌ Error checking dust protocol setup status:', error);
            return {
                isReady: false,
                currentStep: 1,
                InitVersioningCommand: false,
                InitDustProductionCommand: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    }

    /**
     * Check if the dust protocol is ready for user registration - Pure function
     */
    static async isDustProtocolReady(contracts: ContractsRegistry): Promise<boolean> {
        const status = await DustProtocolUtils.checkSetupStatus(contracts);
        return status.isReady;
    }
}

export default DustProtocolUtils;
