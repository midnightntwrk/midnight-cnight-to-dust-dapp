import { logger } from '@/lib/logger';
import { validateEnvOrThrow } from './env';

import { toJson } from '@/lib/utils';
import { Network, ProtocolParameters } from '@lucid-evolution/lucid';
import { protocolParametersForLucid } from './protocolParameters';

// Validate environment variables at module load time (server-side only)
// Skip validation during build time (Next.js build process)
// During build, Next.js analyzes routes but env vars may not be set yet
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || (process.env.NODE_ENV === 'production' && !process.env.NEXT_RUNTIME);

if (typeof window === 'undefined' && !isBuildTime) {
  try {
    validateEnvOrThrow();
  } catch (error) {
    logger.error('[Network]', 'Environment validation failed:', error);
    // Re-throw to prevent app from starting with invalid configuration
    throw error;
  }
}

export type CardanoNetwork = 'Mainnet' | 'Preview' | 'Preprod' | 'Emulator' | 'Custom';
interface NetworkConfig {
  BLOCKFROST_URL: string;
  BLOCKCHAIN_EXPLORER_URL: string;
  BLOCKCHAIN_EXPLORER_SUBPATH: Record<'transaction' | 'address' | 'policy', string>;
  BLOCKFROST_KEY: string | undefined;
  CNIGHT_CURRENCY_POLICY_ID: string | undefined;
  CNIGHT_CURRENCY_ENCODEDNAME: string | undefined;
}

const networkConfigs: Record<CardanoNetwork, NetworkConfig> = {
  Mainnet: {
    BLOCKFROST_URL: process.env.NEXT_PUBLIC_BLOCKFROST_URL_MAINNET || 'https://cardano-mainnet.blockfrost.io/api/v0',
    BLOCKCHAIN_EXPLORER_URL: process.env.NEXT_PUBLIC_BLOCKCHAIN_EXPLORER_URL_MAINNET || 'https://cexplorer.io',
    // BLOCKCHAIN_EXPLORER_URL: process.env.NEXT_PUBLIC_BLOCKCHAIN_EXPLORER_URL_MAINNET || 'https://cardanoscan.io',
    BLOCKCHAIN_EXPLORER_SUBPATH: {
      transaction: 'tx',
      address: 'addr',
      policy: 'policy',
    },
    BLOCKFROST_KEY: process.env.BLOCKFROST_KEY_MAINNET,
    CNIGHT_CURRENCY_POLICY_ID: process.env.NEXT_PUBLIC_MAINNET_CNIGHT_CURRENCY_POLICY_ID,
    CNIGHT_CURRENCY_ENCODEDNAME: process.env.NEXT_PUBLIC_MAINNET_CNIGHT_CURRENCY_ENCODEDNAME,
  },
  Preview: {
    BLOCKFROST_URL: process.env.NEXT_PUBLIC_BLOCKFROST_URL_PREVIEW || 'https://cardano-preview.blockfrost.io/api/v0',
    BLOCKCHAIN_EXPLORER_URL: process.env.NEXT_PUBLIC_BLOCKCHAIN_EXPLORER_URL_PREVIEW || 'https://preview.cexplorer.io',
    // BLOCKCHAIN_EXPLORER_URL: process.env.NEXT_PUBLIC_BLOCKCHAIN_EXPLORER_URL_PREVIEW || 'https://preview.cardanoscan.io',
    BLOCKCHAIN_EXPLORER_SUBPATH: {
      transaction: 'tx',
      address: 'addr',
      policy: 'policy',
    },
    BLOCKFROST_KEY: process.env.BLOCKFROST_KEY_PREVIEW,
    CNIGHT_CURRENCY_POLICY_ID: process.env.NEXT_PUBLIC_PREVIEW_CNIGHT_CURRENCY_POLICY_ID,
    CNIGHT_CURRENCY_ENCODEDNAME: process.env.NEXT_PUBLIC_PREVIEW_CNIGHT_CURRENCY_ENCODEDNAME,
  },
  Preprod: {
    BLOCKFROST_URL: process.env.NEXT_PUBLIC_BLOCKFROST_URL_PREPROD || 'https://cardano-preprod.blockfrost.io/api/v0',
    BLOCKCHAIN_EXPLORER_URL: process.env.NEXT_PUBLIC_BLOCKCHAIN_EXPLORER_URL_PREPROD || 'https://preprod.cexplorer.io',
    // BLOCKCHAIN_EXPLORER_URL: process.env.NEXT_PUBLIC_BLOCKCHAIN_EXPLORER_URL_PREPROD || 'https://preprod.cardanoscan.io',
    BLOCKCHAIN_EXPLORER_SUBPATH: {
      transaction: 'tx',
      address: 'addr',
      policy: 'policy',
    },
    BLOCKFROST_KEY: process.env.BLOCKFROST_KEY_PREPROD,
    CNIGHT_CURRENCY_POLICY_ID: process.env.NEXT_PUBLIC_PREPROD_CNIGHT_CURRENCY_POLICY_ID,
    CNIGHT_CURRENCY_ENCODEDNAME: process.env.NEXT_PUBLIC_PREPROD_CNIGHT_CURRENCY_ENCODEDNAME,
  },
  Emulator: {
    BLOCKFROST_URL: 'http://localhost:3001',
    BLOCKCHAIN_EXPLORER_URL: 'http://localhost:3001/',
    BLOCKCHAIN_EXPLORER_SUBPATH: {
      transaction: 'tx',
      address: 'addr',
      policy: 'policy',
    },
    BLOCKFROST_KEY: '',
    CNIGHT_CURRENCY_POLICY_ID: '',
    CNIGHT_CURRENCY_ENCODEDNAME: '',
  },
  Custom: {
    BLOCKFROST_URL: process.env.NEXT_PUBLIC_BLOCKFROST_URL_CUSTOM || '',
    BLOCKCHAIN_EXPLORER_URL: process.env.NEXT_PUBLIC_BLOCKCHAIN_EXPLORER_URL_CUSTOM || '',
    BLOCKCHAIN_EXPLORER_SUBPATH: {
      transaction: 'tx',
      address: 'addr',
      policy: 'policy',
    },
    BLOCKFROST_KEY: '',
    CNIGHT_CURRENCY_POLICY_ID: '',
    CNIGHT_CURRENCY_ENCODEDNAME: '',
  },
};

// Get current network from environment
const getCurrentNetwork = (): CardanoNetwork => {
  try {
    const network = CARDANO_NET as CardanoNetwork;
    if (!network || !networkConfigs[network]) {
      throw new Error(`Invalid or missing NEXT_PUBLIC_CARDANO_NET: ${network}. Defaulting to Preview.`);
    }
    return network;
  } catch (error) {
    logger.error('[Network]', 'Error getting current network:', error);
    throw error;
  }
};

// Get current network configuration
const getCurrentNetworkConfig = (): NetworkConfig => {
  try {
    const network = getCurrentNetwork();
    const config = networkConfigs[network];

    // Skip validation during build time
    if (isBuildTime) {
      return config;
    }

    if (typeof window === 'undefined' && !config.BLOCKFROST_KEY) {
      throw new Error(`Missing required environment variable: BLOCKFROST_KEY for network: ${network} in ${toJson(config)}`);
    }

    if (!config.CNIGHT_CURRENCY_POLICY_ID) {
      throw new Error(`Missing required environment variable: CNIGHT_CURRENCY_POLICY_ID for network: ${network} in ${toJson(config)}`);
    }

    if (config.CNIGHT_CURRENCY_ENCODEDNAME === undefined) {
      throw new Error(`Missing required environment variable: CNIGHT_CURRENCY_ENCODEDNAME for network: ${network} in ${toJson(config)}`);
    }

    return config;
  } catch (error) {
    logger.error('[Network]', 'Error getting current network config:', error);
    throw error;
  }
};

// Helper function to get CardanoScan URL for current network
const getCardanoScanUrl = (type: 'transaction' | 'address' | 'policy', id: string): string => {
  const baseUrl: string = BLOCKCHAIN_EXPLORER_URL;
  const subPath = BLOCKCHAIN_EXPLORER_SUBPATH[type];
  return `${baseUrl}/${subPath}/${id}`;
};

// Convert CardanoNetwork to LucidNetwork
const getLucidNetwork = (): Network => {
  const network = getCurrentNetwork();
  // Map Emulator and Custom to Preprod for Lucid compatibility
  if (network === 'Emulator' || network === 'Custom') {
    return 'Custom';
  }
  return network as Network;
};

const initializeLucidWithBlockfrostClientSide = async () => {
  logger.log('[Network]', `initializeLucidWithBlockfrostClientSide`);
  try {
    //-----------------
    const protocolParameters = protocolParametersForLucid[CARDANO_NET! as keyof typeof protocolParametersForLucid] as ProtocolParameters;
    //-----------------
    // Dynamic import to avoid SSR issues
    const { Lucid, Blockfrost } = await import('@lucid-evolution/lucid');

    const apiServerUrl = process.env.NEXT_PUBLIC_REACT_SERVER_API_URL || '';

    const lucid = await Lucid(new Blockfrost(apiServerUrl + '/blockfrost', 'xxxx'), getLucidNetwork(), {
      presetProtocolParameters: protocolParameters,
    });
    return lucid;
  } catch (error) {
    logger.log('[Network]', `initializeLucidWithBlockfrostClientSide - Error: ${error}`);
    throw error;
  }
};

//---------------------------------------------------

// During build, provide a default value if not set
export const CARDANO_NET = process.env.NEXT_PUBLIC_CARDANO_NET || 'Preview';

export const LUCID_NETWORK_MAINNET_NAME = 'Mainnet';
export const LUCID_NETWORK_PREVIEW_NAME = 'Preview';
export const LUCID_NETWORK_PREPROD_NAME = 'Preprod';
export const LUCID_NETWORK_CUSTOM_NAME = 'Custom';
export const LUCID_NETWORK_EMULATOR_NAME_MOCK_NO_EXISTE_EN_LUCID = 'Emulator';

export const NETWORK_MAINNET_ID = 1;
export const NETWORK_TESTNET_ID = 0;

export const NETWORK_ID = CARDANO_NET === LUCID_NETWORK_MAINNET_NAME ? NETWORK_MAINNET_ID : NETWORK_TESTNET_ID;

export const isEmulator = CARDANO_NET === LUCID_NETWORK_EMULATOR_NAME_MOCK_NO_EXISTE_EN_LUCID;
export const isTestnet =
  CARDANO_NET === LUCID_NETWORK_EMULATOR_NAME_MOCK_NO_EXISTE_EN_LUCID ||
  CARDANO_NET === LUCID_NETWORK_PREVIEW_NAME ||
  CARDANO_NET === LUCID_NETWORK_PREPROD_NAME ||
  CARDANO_NET === LUCID_NETWORK_CUSTOM_NAME;
export const isPreview = CARDANO_NET === LUCID_NETWORK_PREVIEW_NAME;
export const isPreprod = CARDANO_NET === LUCID_NETWORK_PREPROD_NAME;
export const isMainnet = CARDANO_NET === LUCID_NETWORK_MAINNET_NAME;

logger.info('network configuration:', networkConfigs)

//---------------------------------------------------
// Export current network constants
// During build time, use default values to avoid errors
// At runtime, these will be properly validated and set
let config: NetworkConfig;
if (isBuildTime) {
  // During build, use Preview config directly without validation
  config = networkConfigs.Preview;
  logger.info('network configuration:', networkConfigs)
} else {
  try {
    config = getCurrentNetworkConfig();
    logger.info('current configuration:', config)
  } catch (error) {
    logger.error('[Network]', 'Error getting current network config:', error);
    throw error;
  }
}

export const BLOCKFROST_URL = config.BLOCKFROST_URL;
export const BLOCKCHAIN_EXPLORER_URL = config.BLOCKCHAIN_EXPLORER_URL;
export const BLOCKCHAIN_EXPLORER_SUBPATH = config.BLOCKCHAIN_EXPLORER_SUBPATH;
export const BLOCKFROST_KEY = config.BLOCKFROST_KEY;
export const CNIGHT_CURRENCY_POLICY_ID = config.CNIGHT_CURRENCY_POLICY_ID!;
export const CNIGHT_CURRENCY_ENCODEDNAME = config.CNIGHT_CURRENCY_ENCODEDNAME!;

// Indexer and Simulation Mode
export const INDEXER_ENDPOINT = process.env.INDEXER_ENDPOINT || process.env.NEXT_PUBLIC_INDEXER_ENDPOINT;
//---------------------------------------------------
// Export utility functions
export { config as currentNetworkConfig, getCardanoScanUrl, getCurrentNetwork, getCurrentNetworkConfig, getLucidNetwork, initializeLucidWithBlockfrostClientSide, networkConfigs };
//---------------------------------------------------
