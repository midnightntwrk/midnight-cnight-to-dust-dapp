import * as Contracts from '@/config/contract_blueprint';
import { getRuntimeConfig } from '@/config/runtime-config';
import { addressFromValidator, Script as BlazeScript, CredentialType, PolicyId, RewardAddress } from '@blaze-cardano/core';
import { serialize } from '@blaze-cardano/data';
import { Script as LucidScript } from '@lucid-evolution/lucid';
import { logger } from './logger';

// Helper to get network ID from runtime config
function getNetworkId(): number {
  const config = getRuntimeConfig();
  return config.CARDANO_NET === 'Mainnet' ? 1 : 0;
}

/**
 *
 * Convert Blaze Script to Lucid Script format
 */
export function blazeToLucidScript(blazeScript: BlazeScript): LucidScript {
  const core = blazeScript.toCore() as any;  

  enum BlazePlutusLanguageVersion {
    V1 = 0,
    V2 = 1,
    V3 = 2,
  }

  let LucidScriptType: 'PlutusV1' | 'PlutusV2' | 'PlutusV3';

  switch (core.version) {
    case BlazePlutusLanguageVersion.V1:
      LucidScriptType = 'PlutusV1';
      break;
    case BlazePlutusLanguageVersion.V2:
      LucidScriptType = 'PlutusV2';
      break;
    case BlazePlutusLanguageVersion.V3:
      LucidScriptType = 'PlutusV3';
      break;
    default:
      throw new Error(`Unsupported script language: ${core.version}`);
  }

  return {
    type: LucidScriptType,
    script: core.bytes,
  };
}

/**
 * Get validator address from script
 */
export function getValidatorAddress(script: BlazeScript): string {
  return addressFromValidator(getNetworkId(), script).toBech32();
}

/**
 * Get stake address from script hash
 */
export function getStakeAddress(script: BlazeScript): string {
  const scriptHash = script.hash();
  return RewardAddress.fromCredentials(getNetworkId(), {
    type: CredentialType.ScriptHash,
    hash: scriptHash,
  })
    .toAddress()
    .toBech32();
}

/**
 * Get policy ID from script
 */
export function getPolicyId(script: BlazeScript): string {
  return PolicyId(script.hash());
}

/**
 * Serialize data to CBOR format
 */
 
export function serializeToCbor(type: any, data: any): string {
  return serialize(type, data).toCbor();
}

export enum NETWORKS {
  MAINNET = 'Mainnet',
  PREPROD = 'Preprod',
  PREVIEW = 'Preview',
}

/**
 * Log all configuration and contract addresses at startup for debugging
 */
export function logContractAddresses(): void {
  const config = getRuntimeConfig();
  const networkId = getNetworkId();

  // Get network-specific values
  const blockfrostUrl = config.CARDANO_NET === NETWORKS.MAINNET
    ? config.BLOCKFROST_URL_MAINNET
    : config.CARDANO_NET === NETWORKS.PREPROD
    ? config.BLOCKFROST_URL_PREPROD
    : config.BLOCKFROST_URL_PREVIEW;

  const explorerUrl = config.CARDANO_NET === NETWORKS.MAINNET
    ? config.BLOCKCHAIN_EXPLORER_URL_MAINNET
    : config.CARDANO_NET === NETWORKS.PREPROD
    ? config.BLOCKCHAIN_EXPLORER_URL_PREPROD
    : config.BLOCKCHAIN_EXPLORER_URL_PREVIEW;

  const cnightPolicyId = config.CARDANO_NET === NETWORKS.MAINNET
    ? config.MAINNET_CNIGHT_CURRENCY_POLICY_ID
    : config.CARDANO_NET === NETWORKS.PREPROD
    ? config.PREPROD_CNIGHT_CURRENCY_POLICY_ID
    : config.PREVIEW_CNIGHT_CURRENCY_POLICY_ID;

  const cnightEncodedName = config.CARDANO_NET === NETWORKS.MAINNET
    ? config.MAINNET_CNIGHT_CURRENCY_ENCODEDNAME
    : config.CARDANO_NET === NETWORKS.PREPROD
    ? config.PREPROD_CNIGHT_CURRENCY_ENCODEDNAME
    : config.PREVIEW_CNIGHT_CURRENCY_ENCODEDNAME;

  logger.log('[Startup]', '🚀 ========== MIDNIGHT DAPP CONFIGURATION (STARTUP) ==========');

  // Network Configuration
  logger.log('[Startup]', '📍 NETWORK:');
  logger.log('[Startup]', `   Cardano Network: ${config.CARDANO_NET} (ID: ${networkId})`);
  logger.log('[Startup]', `   Blockfrost URL: ${blockfrostUrl}`);
  logger.log('[Startup]', `   Explorer URL: ${explorerUrl}`);

  // cNIGHT Token Configuration
  logger.log('[Startup]', '🌙 cNIGHT TOKEN:');
  logger.log('[Startup]', `   Policy ID: ${cnightPolicyId}`);
  logger.log('[Startup]', `   Encoded Name: ${cnightEncodedName}`);

  // Indexer Configuration
  logger.log('[Startup]', '📊 INDEXER:');
  logger.log('[Startup]', `   Endpoint: ${config.INDEXER_ENDPOINT || '(not configured)'}`);

  try {
    // DUST Generator (Mapping) Contract
    const dustGenerator = new Contracts.CnightGeneratesDustCnightGeneratesDustElse();
    const dustGeneratorAddress = getValidatorAddress(dustGenerator.Script);
    const dustGeneratorPolicyId = getPolicyId(dustGenerator.Script);
    const dustGeneratorStakeAddress = getStakeAddress(dustGenerator.Script);

    logger.log('[Startup]', '📋 DUST GENERATOR CONTRACT:');
    logger.log('[Startup]', `   Address: ${dustGeneratorAddress}`);
    logger.log('[Startup]', `   Policy ID: ${dustGeneratorPolicyId}`);
    logger.log('[Startup]', `   Stake Address: ${dustGeneratorStakeAddress}`);

    // ============ TEST: Convert payment hash to stake address format ============
    // This is for testing if the indexer searches by the c_wallet hash from datum
    const testPaymentHash = 'abfff883edcf7a2e38628015cebb72952e361b2c8a2262f7daf9c16e';

    // Build a reward address using the payment hash as if it were a stake credential
    // Network ID 0 = testnet, prefix e0 for key hash stake address
    const fakeStakeAddressFromPaymentHash = RewardAddress.fromCredentials(networkId, {
      type: CredentialType.KeyHash,

      hash: testPaymentHash as any,
    })
      .toAddress()
      .toBech32();

    logger.log('[Startup]', '🧪 TEST - Payment Hash to Stake Address:');
    logger.log('[Startup]', `   Payment Hash (from datum): ${testPaymentHash}`);
    logger.log('[Startup]', `   As Stake Address (bech32): ${fakeStakeAddressFromPaymentHash}`);
    logger.log('[Startup]', '   👆 Try querying indexer with this stake address!');
    // ============ END TEST ============

    logger.log('[Startup]', '🚀 ===========================================================');
  } catch (error) {
    logger.error('[Startup]', '❌ Error logging contract addresses:', error);
  }
}
