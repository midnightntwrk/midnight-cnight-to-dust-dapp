import { LucidEvolution } from '@lucid-evolution/lucid';
import { contractService } from './contractService';

export interface DustProtocolStatus {
    isReady: boolean;
    currentStep: number;
    InitVersioningCommand: boolean;
    InitDustProductionCommand: boolean;
    error?: string;
}

class DustProtocolService {
    
    /**
     * Get the Version Oracle validator address
     */
    private async getVersionOracleAddress(): Promise<string> {
        // First ensure contracts are loaded
        await contractService.loadAllContracts();
        
        const versionOracleValidatorContract = contractService.getContract('version-oracle-validator.plutus');
        if (!versionOracleValidatorContract?.address) {
            throw new Error('Version Oracle validator contract not found or address not computed');
        }
        return versionOracleValidatorContract.address;
    }

    /**
     * Check the current dust protocol setup status
     * Returns setup step needed: 1 = Step 01 needed, 2 = Step 02 needed, 3 = Ready for registration
     */
    async checkSetupStatus(lucidInstance: LucidEvolution): Promise<DustProtocolStatus> {
        try {
            console.log('🔍 Starting dust protocol setup status check...');

            // Load contracts first
            await contractService.loadAllContracts();

            // Check for Version Oracle UTxO (Step 01 completion)
            console.log('📍 Getting Version Oracle address...');
            const versionOracleAddress = await this.getVersionOracleAddress();

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

            console.log('🎯 Version Oracle check result:', { InitVersioningCommand: hasVersionOracle });

            if (!hasVersionOracle) {
                console.log('⏭️ Setup step 1 needed (InitVersioningCommand not completed)');
                return {
                    isReady: false,
                    currentStep: 1,
                    InitVersioningCommand: false,
                    InitDustProductionCommand: false
                };
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
            const hasMultipleVersionOracleTokens = versionOracleTokens.length >= 4;
            
            if (!hasMultipleVersionOracleTokens) {
                console.log('⏭️ Setup step 2 needed (InitDustProductionCommand not completed)');
                return {
                    isReady: false,
                    currentStep: 2,
                    InitVersioningCommand: true,
                    InitDustProductionCommand: false
                };
            }

            // Both steps completed - ready for registration
            console.log('✅ Dust protocol is ready for user registration (InitVersioningCommand & InitDustProductionCommand completed)');
            return {
                isReady: true,
                currentStep: 3,
                InitVersioningCommand: true,
                InitDustProductionCommand: true
            };

        } catch (error) {
            console.error('❌ Error checking dust protocol setup status:', error);
            return {
                isReady: false,
                currentStep: 1,
                InitVersioningCommand: false,
                InitDustProductionCommand: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    /**
     * Check if the dust protocol is ready for user registration
     */
    async isDustProtocolReady(lucidInstance: LucidEvolution): Promise<boolean> {
        const status = await this.checkSetupStatus(lucidInstance);
        return status.isReady;
    }
}

// Export singleton instance
export const dustProtocolService = new DustProtocolService();
export default dustProtocolService;
