import { getLucidNetwork } from '@/config/network';
import { toJson } from '@/lib/utils';
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

export class ContractUtils {
    /**
     * Load specified contracts and compute their hashes/addresses - Pure function
     */
    static async loadContracts(contractFiles: readonly string[]): Promise<ContractsRegistry> {
        console.log('[Contracts]', '🔄 Loading contracts and computing hashes/addresses...');
        console.log('[Contracts]', '📂 Contract files to load:', contractFiles);

        const loadedContracts: ContractsRegistry = {};

        // Load all contract files
        for (const filename of contractFiles) {
            try {
                // console.log('[Contracts]',`📄 Loading contract: ${filename}`);

                // Try both possible paths
                let response = await fetch(`/contracts/${filename}`);
                if (!response.ok) {
                    console.log('[Contracts]',`   ⚠️ /contracts/${filename} not found, trying /contracts/${filename}`);
                    response = await fetch(`/contracts/${filename}`);
                }

                if (!response.ok) {
                    console.error('[Contracts]', `❌ Failed to fetch ${filename}:`, response.status, response.statusText);
                    continue;
                }

                const rawContent = await response.text();
                const contractInfo = ContractUtils.computeContractInfo(filename, rawContent);

                if (contractInfo) {
                    loadedContracts[filename] = contractInfo;
                }
            } catch (error) {
                console.error('[Contracts]', `❌ Error loading ${filename}:`, error);
            }
        }

        // Log comprehensive summary
        console.log('[Contracts]', '🎯 CONTRACT LOADING SUMMARY:');
        console.log('[Contracts]', '=====================================');
        console.log('[Contracts]',`📊 Total contracts loaded: ${Object.keys(loadedContracts).length}/${contractFiles.length}`);
        console.log('[Contracts]', '📋 Successfully loaded contracts:');

        for (const [filename, info] of Object.entries(loadedContracts)) {
            console.log('[Contracts]', 
                `   ✅ ${filename}:`,
                toJson({
                    type: info.type,
                    scriptHash: info.scriptHash,
                    policyId: info.policyId,
                    address: info.address,
                    size: info.cborHex.length,
                })
            );
        }

        const failed = contractFiles.filter((f: string) => !loadedContracts[f]);
        if (failed.length > 0) {
            console.log('[Contracts]', '❌ Failed to load contracts:', failed);
        }

        console.log('[Contracts]', '=====================================');

        return loadedContracts;
    }

    /**
     * Compute contract information from raw content - Pure function
     */
    static computeContractInfo(filename: string, rawContent: string): ContractInfo | null {
        try {
            // Parse contract content
            let parsedContract;
            let cborHex: string;

            try {
                parsedContract = JSON.parse(rawContent);
                cborHex = parsedContract.cborHex;

                if (!cborHex) {
                    console.error('[Contracts]', `❌ No cborHex found in ${filename}`);
                    return null;
                }
            } catch (parseError) {
                console.error('[Contracts]', `❌ Failed to parse JSON in ${filename}:`, parseError);
                return null;
            }

            // Create script object with proper type mapping
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
                script: cborHex,
            };

            const contractInfo: ContractInfo = {
                filename,
                rawContent,
                cborHex,
                type: parsedContract.type || 'PlutusV2',
                scriptObject,
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
                    const address = validatorToAddress(getLucidNetwork(), scriptObject);
                    contractInfo.scriptHash = scriptHash;
                    contractInfo.address = address;
                }
            } catch (computeError) {
                console.error('[Contracts]', `❌ Failed to compute hash/address for ${filename}:`, computeError);
                // Still add to registry even if hash computation fails
            }

            return contractInfo;
        } catch {
            return null;
        }
    }

    /**
     * Get a specific contract by filename - Pure function
     */
    static getContract(contracts: ContractsRegistry, filename: string): ContractInfo | null {
        return contracts[filename] || null;
    }
}

export default ContractUtils;
