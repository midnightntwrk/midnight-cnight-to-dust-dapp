// // TODO: deleted - new smart cotnracts
// import { getLucidNetwork } from '@/config/network';
// import { logger } from '@/lib/logger';
// import { toJson } from '@/lib/utils';
// import { validatorToAddress, validatorToScriptHash, mintingPolicyToId, Script } from '@lucid-evolution/lucid';

// /**
//  * Aiken Contract Information
//  * Based on Aiken's plutus.json blueprint format (CIP-0057)
//  */
// export interface AikenContractInfo {
//     title: string;
//     compiledCode: string;
//     hash: string;
//     type: 'PlutusV3' | 'PlutusV2' | 'PlutusV1';
//     scriptHash?: string;
//     policyId?: string;
//     address?: string;
//     scriptObject?: Script;
// }

// export interface AikenContractsRegistry {
//     [contractTitle: string]: AikenContractInfo;
// }

// /**
//  * Aiken Blueprint structure (CIP-0057)
//  */
// interface AikenBlueprint {
//     preamble: {
//         title: string;
//         description?: string;
//         version: string;
//         plutusVersion: string;
//         compiler: {
//             name: string;
//             version: string;
//         };
//         license?: string;
//     };
//     validators: Array<{
//         title: string;
//         compiledCode: string;
//         hash: string;
//         datum?: unknown;
//         redeemer?: unknown;
//     }>;
// }

// export class AikenContractUtils {
//     /**
//      * Load Aiken contracts from plutus.json blueprint
//      * @param blueprintPath - Path to plutus.json file (default: /aiken-contracts/plutus.json)
//      * @param contractTitles - Array of validator titles to load (e.g., ["reserve.reserve_logic.else"])
//      */
//     static async loadAikenContracts(
//         blueprintPath: string = '/aiken-contracts/plutus.json',
//         contractTitles: readonly string[]
//     ): Promise<AikenContractsRegistry> {
//         logger.log('[Aiken Contracts]', '🔄 Loading Aiken contracts from blueprint...');
//         logger.log('[Aiken Contracts]', '📂 Blueprint path:', blueprintPath);
//         logger.log('[Aiken Contracts]', '📋 Contract titles to load:', contractTitles);

//         const loadedContracts: AikenContractsRegistry = {};

//         try {
//             // Fetch the plutus.json blueprint
//             const response = await fetch(blueprintPath);
            
//             if (!response.ok) {
//                 logger.error('[Aiken Contracts]', `❌ Failed to fetch blueprint:`, response.status, response.statusText);
//                 return loadedContracts;
//             }

//             const blueprint: AikenBlueprint = await response.json();

//             logger.log('[Aiken Contracts]', '📦 Blueprint loaded:', {
//                 title: blueprint.preamble.title,
//                 version: blueprint.preamble.version,
//                 plutusVersion: blueprint.preamble.plutusVersion,
//                 totalValidators: blueprint.validators.length
//             });

//             // Load specified contracts
//             for (const title of contractTitles) {
//                 const validator = blueprint.validators.find(v => v.title === title);

//                 if (!validator) {
//                     logger.error('[Aiken Contracts]', `❌ Validator not found: ${title}`);
//                     continue;
//                 }

//                 const contractInfo = AikenContractUtils.computeAikenContractInfo(
//                     validator,
//                     blueprint.preamble.plutusVersion
//                 );

//                 if (contractInfo) {
//                     loadedContracts[title] = contractInfo;
//                 }
//             }

//             // Log summary
//             logger.log('[Aiken Contracts]', '🎯 AIKEN CONTRACT LOADING SUMMARY:');
//             logger.log('[Aiken Contracts]', '=====================================');
//             logger.log('[Aiken Contracts]', `📊 Total contracts loaded: ${Object.keys(loadedContracts).length}/${contractTitles.length}`);
//             logger.log('[Aiken Contracts]', '📋 Successfully loaded contracts:');

//             for (const [title, info] of Object.entries(loadedContracts)) {
//                 logger.log('[Aiken Contracts]',
//                     `   ✅ ${title}:`,
//                     toJson({
//                         type: info.type,
//                         hash: info.hash,
//                         scriptHash: info.scriptHash,
//                         policyId: info.policyId,
//                         address: info.address,
//                         codeSize: info.compiledCode.length
//                     })
//                 );
//             }

//             const failed = contractTitles.filter((t: string) => !loadedContracts[t]);
//             if (failed.length > 0) {
//                 logger.log('[Aiken Contracts]', '❌ Failed to load contracts:', failed);
//             }

//             logger.log('[Aiken Contracts]', '=====================================');

//         } catch (error) {
//             logger.error('[Aiken Contracts]', '❌ Error loading Aiken blueprint:', error);
//         }

//         return loadedContracts;
//     }

//     /**
//      * Compute contract information from Aiken validator
//      */
//     static computeAikenContractInfo(
//         validator: { title: string; compiledCode: string; hash: string },
//         plutusVersion: string
//     ): AikenContractInfo | null {
//         try {
//             // Map Aiken plutusVersion to Lucid script type
//             let scriptType: 'PlutusV1' | 'PlutusV2' | 'PlutusV3' = 'PlutusV3';
//             if (plutusVersion === 'v1') {
//                 scriptType = 'PlutusV1';
//             } else if (plutusVersion === 'v2') {
//                 scriptType = 'PlutusV2';
//             } else if (plutusVersion === 'v3') {
//                 scriptType = 'PlutusV3';
//             }

//             // Create script object
//             const scriptObject: Script = {
//                 type: scriptType,
//                 script: validator.compiledCode,
//             };

//             const contractInfo: AikenContractInfo = {
//                 title: validator.title,
//                 compiledCode: validator.compiledCode,
//                 hash: validator.hash,
//                 type: scriptType,
//                 scriptObject,
//             };

//             // Compute hashes and addresses based on contract type
//             try {
//                 // Check if it's a minting policy (contains 'mint' or 'policy' in title)
//                 if (validator.title.includes('mint') || validator.title.includes('policy')) {
//                     const policyId = mintingPolicyToId(scriptObject);
//                     contractInfo.policyId = policyId;
//                     contractInfo.scriptHash = policyId;
//                 } else {
//                     // It's a validator script
//                     const scriptHash = validatorToScriptHash(scriptObject);
//                     const address = validatorToAddress(getLucidNetwork(), scriptObject);
//                     contractInfo.scriptHash = scriptHash;
//                     contractInfo.address = address;
//                 }
//             } catch (computeError) {
//                 logger.error('[Aiken Contracts]', `❌ Failed to compute hash/address for ${validator.title}:`, computeError);
//             }

//             return contractInfo;
//         } catch (error) {
//             logger.error('[Aiken Contracts]', `❌ Error processing validator ${validator.title}:`, error);
//             return null;
//         }
//     }

//     /**
//      * Get a specific contract by title
//      */
//     static getContract(contracts: AikenContractsRegistry, title: string): AikenContractInfo | null {
//         return contracts[title] || null;
//     }

//     /**
//      * List all available validators in a blueprint (for discovery)
//      */
//     static async listAvailableValidators(blueprintPath: string = '/aiken-contracts/plutus.json'): Promise<string[]> {
//         try {
//             const response = await fetch(blueprintPath);
//             if (!response.ok) return [];
            
//             const blueprint: AikenBlueprint = await response.json();
//             return blueprint.validators.map(v => v.title);
//         } catch (error) {
//             logger.error('[Aiken Contracts]', '❌ Error listing validators:', error);
//             return [];
//         }
//     }
// }

// export default AikenContractUtils;
