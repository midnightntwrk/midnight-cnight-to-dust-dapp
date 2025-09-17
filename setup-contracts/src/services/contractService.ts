import { toJson } from '@/components/SetupActions';
import { validatorToAddress, validatorToScriptHash, mintingPolicyToId, Script } from '@lucid-evolution/lucid';

export interface ContractInfo {
    filename: string;
    rawContent: string;
    cborHex: string;
    type: string;
    scriptHash?: string;
    policyId?: string;
    address?: string;
    scriptObject?: Script;
}

export interface ContractsRegistry {
    [contractName: string]: ContractInfo;
}

class ContractService {
    private contracts: ContractsRegistry = {};
    private isLoaded = false;
    private isLoading = false;
    private loadingPromise: Promise<ContractsRegistry> | null = null;
    private readonly contractFiles = [
        'dust-mapping-validator.plutus',
        'dust-auth-token-policy.plutus', 
        'dust-auth-token-minting-policy.plutus',
        'dust-auth-token-burning-policy.plutus',
        'dust-mapping-validator-spend-policy.plutus',
        'version-oracle-validator.plutus',
        'version-oracle-policy.plutus',
        'governance-multisig-policy.plutus'
    ];

    private readonly network: 'Preprod' | 'Mainnet' = 'Preprod';

    /**
     * Load all contracts and compute their hashes/addresses
     */
    async loadAllContracts(): Promise<ContractsRegistry> {
        if (this.isLoaded) {
            console.log('📋 Contracts already loaded, returning cached registry');
            return this.contracts;
        }

        // Prevent duplicate loading in React StrictMode
        if (this.isLoading && this.loadingPromise) {
            console.log('⚠️ Contracts loading already in progress, waiting for completion...');
            return await this.loadingPromise;
        }

        // Start loading
        this.isLoading = true;
        this.loadingPromise = this.doLoadAllContracts();
        
        try {
            const result = await this.loadingPromise;
            this.isLoaded = true;
            return result;
        } finally {
            this.isLoading = false;
            this.loadingPromise = null;
        }
    }

    /**
     * Internal method to actually load contracts
     */
    private async doLoadAllContracts(): Promise<ContractsRegistry> {

        console.log('🔄 Loading all contracts and computing hashes/addresses...');
        console.log('📂 Contract files to load:', this.contractFiles);

        const loadedContracts: ContractsRegistry = {};

        // Load all contract files
        for (const filename of this.contractFiles) {
            try {
                console.log(`📄 Loading contract: ${filename}`);
                
                // Try both possible paths
                let response = await fetch(`/contracts/${filename}`);
                if (!response.ok) {
                    console.log(`   ⚠️ /contracts/${filename} not found, trying /contracts/${filename}`);
                    response = await fetch(`/contracts/${filename}`);
                }
                
                if (!response.ok) {
                    console.error(`❌ Failed to fetch ${filename}:`, response.status, response.statusText);
                    continue;
                }

                const rawContent = await response.text();
                
                // Parse contract content
                let parsedContract;
                let cborHex: string;
                
                try {
                    parsedContract = JSON.parse(rawContent);
                    cborHex = parsedContract.cborHex;
                    
                    if (!cborHex) {
                        console.error(`❌ No cborHex found in ${filename}`);
                        continue;
                    }
                } catch (parseError) {
                    console.error(`❌ Failed to parse JSON in ${filename}:`, parseError);
                    continue;
                }

                // Create script object with proper type mapping
                // Map PlutusScriptV1 -> PlutusV1, PlutusScriptV2 -> PlutusV2, etc.
                let scriptType: 'PlutusV1' | 'PlutusV2' | 'Native' = 'PlutusV2';
                if (parsedContract.type === 'PlutusScriptV1') {
                    scriptType = 'PlutusV1';
                } else if (parsedContract.type === 'PlutusScriptV2') {
                    scriptType = 'PlutusV2';
                } else if (parsedContract.type === 'Native') {
                    scriptType = 'Native';
                }
                
                const scriptObject: Script = {
                    type: scriptType,
                    script: cborHex
                };

                const contractInfo: ContractInfo = {
                    filename,
                    rawContent,
                    cborHex,
                    type: parsedContract.type || 'PlutusV2',
                    scriptObject
                };

                // Compute hashes and addresses based on contract type
                try {
                    if (filename.includes('policy') || filename.includes('minting') || filename.includes('burning')) {
                        // This is a minting policy
                        const policyId = mintingPolicyToId(scriptObject);
                        contractInfo.policyId = policyId;
                        contractInfo.scriptHash = policyId; // For minting policies, policyId = scriptHash
                    } else {
                        // This is a validator script
                        const scriptHash = validatorToScriptHash(scriptObject);
                        const address = validatorToAddress(this.network, scriptObject);
                        contractInfo.scriptHash = scriptHash;
                        contractInfo.address = address;
                    }
                } catch (computeError) {
                    console.error(`❌ Failed to compute hash/address for ${filename}:`, computeError);
                    // Still add to registry even if hash computation fails
                }

                loadedContracts[filename] = contractInfo;

            } catch (error) {
                console.error(`❌ Error loading ${filename}:`, error);
            }
        }

        this.contracts = loadedContracts;

        // Log comprehensive summary
        console.log('🎯 CONTRACT LOADING SUMMARY:');
        console.log('=====================================');
        console.log(`📊 Total contracts loaded: ${Object.keys(loadedContracts).length}/${this.contractFiles.length}`);
        console.log('📋 Successfully loaded contracts:');
        
        for (const [filename, info] of Object.entries(loadedContracts)) {
            console.log(`   ✅ ${filename}:`, toJson({
                type: info.type,
                scriptHash: info.scriptHash,
                policyId: info.policyId,
                address: info.address,
                size: info.cborHex.length
            }));
        }

        const failed = this.contractFiles.filter(f => !loadedContracts[f]);
        if (failed.length > 0) {
            console.log('❌ Failed to load contracts:', failed);
        }

        console.log('=====================================');

        return loadedContracts;
    }

    /**
     * Get a specific contract by filename
     */
    getContract(filename: string): ContractInfo | null {
        if (!this.isLoaded) {
            console.error('❌ Contracts not loaded yet. Call loadAllContracts() first.');
            return null;
        }
        return this.contracts[filename] || null;
    }

    /**
     * Get all loaded contracts
     */
    getAllContracts(): ContractsRegistry {
        return this.contracts;
    }

    /**
     * Get contracts in the old format for backwards compatibility
     */
    getLegacyContractsFormat(): Record<string, string> {
        const legacy: Record<string, string> = {};
        for (const [filename, info] of Object.entries(this.contracts)) {
            legacy[filename] = info.rawContent;
        }
        return legacy;
    }

    /**
     * Find contract by script hash
     */
    findContractByScriptHash(scriptHash: string): ContractInfo | null {
        for (const contract of Object.values(this.contracts)) {
            if (contract.scriptHash === scriptHash || contract.policyId === scriptHash) {
                return contract;
            }
        }
        return null;
    }

    /**
     * Get all policy IDs
     */
    getAllPolicyIds(): Record<string, string> {
        const policies: Record<string, string> = {};
        for (const [filename, info] of Object.entries(this.contracts)) {
            if (info.policyId) {
                policies[filename] = info.policyId;
            }
        }
        return policies;
    }

    /**
     * Get all validator addresses
     */
    getAllValidatorAddresses(): Record<string, string> {
        const addresses: Record<string, string> = {};
        for (const [filename, info] of Object.entries(this.contracts)) {
            if (info.address) {
                addresses[filename] = info.address;
            }
        }
        return addresses;
    }

    /**
     * Check if contracts are loaded
     */
    isContractsLoaded(): boolean {
        return this.isLoaded;
    }

    /**
     * Get contract count
     */
    getContractCount(): number {
        return Object.keys(this.contracts).length;
    }
}

// Export singleton instance
export const contractService = new ContractService();
export default contractService;
