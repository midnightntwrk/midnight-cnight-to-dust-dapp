/**
 * DUST Protocol Configuration
 * 
 * This file contains all the configuration related to the DUST protocol,
 * including the list of smart contracts that need to be loaded.
 */

// List of contract files required for DUST protocol
export const DUST_PROTOCOL_CONTRACTS = [
    'dust-mapping-validator.plutus',
    'dust-auth-token-policy.plutus', 
    'dust-auth-token-minting-policy.plutus',
    'dust-auth-token-burning-policy.plutus',
    'dust-mapping-validator-spend-policy.plutus',
    'version-oracle-validator.plutus',
    'version-oracle-policy.plutus',
    'governance-multisig-policy.plutus'
] as const;

// Export type for better type safety
export type DustProtocolContract = typeof DUST_PROTOCOL_CONTRACTS[number];

