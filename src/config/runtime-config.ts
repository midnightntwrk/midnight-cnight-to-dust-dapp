/**
 * Runtime Configuration
 *
 * This module provides runtime configuration that can be set via environment
 * variables at container startup, enabling "build once, deploy anywhere".
 *
 * - Server-side: Reads from process.env directly (works at runtime)
 * - Client-side: Fetches from /api/runtime-config endpoint
 */

export type CardanoNetwork = 'Mainnet' | 'Preview' | 'Preprod' | 'Emulator' | 'Custom';

export interface RuntimeConfig {
  CARDANO_NET: CardanoNetwork;
  BLOCKFROST_URL_PREVIEW: string;
  BLOCKFROST_URL_PREPROD: string;
  BLOCKFROST_URL_MAINNET: string;
  BLOCKCHAIN_EXPLORER_URL_PREVIEW: string;
  BLOCKCHAIN_EXPLORER_URL_PREPROD: string;
  BLOCKCHAIN_EXPLORER_URL_MAINNET: string;
  PREVIEW_CNIGHT_CURRENCY_POLICY_ID: string;
  PREPROD_CNIGHT_CURRENCY_POLICY_ID: string;
  MAINNET_CNIGHT_CURRENCY_POLICY_ID: string;
  PREVIEW_CNIGHT_CURRENCY_ENCODEDNAME: string;
  PREPROD_CNIGHT_CURRENCY_ENCODEDNAME: string;
  MAINNET_CNIGHT_CURRENCY_ENCODEDNAME: string;
  INDEXER_ENDPOINT: string;
  REACT_SERVER_API_URL: string;
  REACT_SERVER_URL: string;
  SIMULATION_MODE: string;
}

// Default configuration (used during build and as fallback)
const defaultConfig: RuntimeConfig = {
  CARDANO_NET: 'Preview',
  BLOCKFROST_URL_PREVIEW: 'https://cardano-preview.blockfrost.io/api/v0',
  BLOCKFROST_URL_PREPROD: 'https://cardano-preprod.blockfrost.io/api/v0',
  BLOCKFROST_URL_MAINNET: 'https://cardano-mainnet.blockfrost.io/api/v0',
  BLOCKCHAIN_EXPLORER_URL_PREVIEW: 'https://preview.cexplorer.io',
  BLOCKCHAIN_EXPLORER_URL_PREPROD: 'https://preprod.cexplorer.io',
  BLOCKCHAIN_EXPLORER_URL_MAINNET: 'https://cexplorer.io',
  PREVIEW_CNIGHT_CURRENCY_POLICY_ID: 'd2dbff622e509dda256fedbd31ef6e9fd98ed49ad91d5c0e07f68af1',
  PREPROD_CNIGHT_CURRENCY_POLICY_ID: 'd2dbff622e509dda256fedbd31ef6e9fd98ed49ad91d5c0e07f68af1',
  MAINNET_CNIGHT_CURRENCY_POLICY_ID: 'd2dbff622e509dda256fedbd31ef6e9fd98ed49ad91d5c0e07f68af1',
  PREVIEW_CNIGHT_CURRENCY_ENCODEDNAME: '',
  PREPROD_CNIGHT_CURRENCY_ENCODEDNAME: '',
  MAINNET_CNIGHT_CURRENCY_ENCODEDNAME: '',
  INDEXER_ENDPOINT: 'https://indexer.preview.midnight.network/api/v3/graphql',
  REACT_SERVER_API_URL: '',
  REACT_SERVER_URL: '',
  SIMULATION_MODE: 'false',
};

/**
 * Get runtime config on the server side.
 * Reads directly from process.env at runtime.
 */
export function getServerRuntimeConfig(): RuntimeConfig {
  return {
    CARDANO_NET: (process.env.NEXT_PUBLIC_CARDANO_NET as CardanoNetwork) || defaultConfig.CARDANO_NET,
    BLOCKFROST_URL_PREVIEW: process.env.NEXT_PUBLIC_BLOCKFROST_URL_PREVIEW || defaultConfig.BLOCKFROST_URL_PREVIEW,
    BLOCKFROST_URL_PREPROD: process.env.NEXT_PUBLIC_BLOCKFROST_URL_PREPROD || defaultConfig.BLOCKFROST_URL_PREPROD,
    BLOCKFROST_URL_MAINNET: process.env.NEXT_PUBLIC_BLOCKFROST_URL_MAINNET || defaultConfig.BLOCKFROST_URL_MAINNET,
    BLOCKCHAIN_EXPLORER_URL_PREVIEW:
      process.env.NEXT_PUBLIC_BLOCKCHAIN_EXPLORER_URL_PREVIEW || defaultConfig.BLOCKCHAIN_EXPLORER_URL_PREVIEW,
    BLOCKCHAIN_EXPLORER_URL_PREPROD:
      process.env.NEXT_PUBLIC_BLOCKCHAIN_EXPLORER_URL_PREPROD || defaultConfig.BLOCKCHAIN_EXPLORER_URL_PREPROD,
    BLOCKCHAIN_EXPLORER_URL_MAINNET:
      process.env.NEXT_PUBLIC_BLOCKCHAIN_EXPLORER_URL_MAINNET || defaultConfig.BLOCKCHAIN_EXPLORER_URL_MAINNET,
    PREVIEW_CNIGHT_CURRENCY_POLICY_ID:
      process.env.NEXT_PUBLIC_PREVIEW_CNIGHT_CURRENCY_POLICY_ID || defaultConfig.PREVIEW_CNIGHT_CURRENCY_POLICY_ID,
    PREPROD_CNIGHT_CURRENCY_POLICY_ID:
      process.env.NEXT_PUBLIC_PREPROD_CNIGHT_CURRENCY_POLICY_ID || defaultConfig.PREPROD_CNIGHT_CURRENCY_POLICY_ID,
    MAINNET_CNIGHT_CURRENCY_POLICY_ID:
      process.env.NEXT_PUBLIC_MAINNET_CNIGHT_CURRENCY_POLICY_ID || defaultConfig.MAINNET_CNIGHT_CURRENCY_POLICY_ID,
    PREVIEW_CNIGHT_CURRENCY_ENCODEDNAME:
      process.env.NEXT_PUBLIC_PREVIEW_CNIGHT_CURRENCY_ENCODEDNAME ?? defaultConfig.PREVIEW_CNIGHT_CURRENCY_ENCODEDNAME,
    PREPROD_CNIGHT_CURRENCY_ENCODEDNAME:
      process.env.NEXT_PUBLIC_PREPROD_CNIGHT_CURRENCY_ENCODEDNAME ?? defaultConfig.PREPROD_CNIGHT_CURRENCY_ENCODEDNAME,
    MAINNET_CNIGHT_CURRENCY_ENCODEDNAME:
      process.env.NEXT_PUBLIC_MAINNET_CNIGHT_CURRENCY_ENCODEDNAME ?? defaultConfig.MAINNET_CNIGHT_CURRENCY_ENCODEDNAME,
    INDEXER_ENDPOINT: process.env.NEXT_PUBLIC_INDEXER_ENDPOINT || defaultConfig.INDEXER_ENDPOINT,
    REACT_SERVER_API_URL: process.env.NEXT_PUBLIC_REACT_SERVER_API_URL || defaultConfig.REACT_SERVER_API_URL,
    REACT_SERVER_URL: process.env.NEXT_PUBLIC_REACT_SERVER_URL || defaultConfig.REACT_SERVER_URL,
    SIMULATION_MODE: process.env.NEXT_PUBLIC_SIMULATION_MODE || defaultConfig.SIMULATION_MODE,
  };
}

// Config cache
let clientConfigCache: RuntimeConfig | null = null;
let clientConfigPromise: Promise<RuntimeConfig> | null = null;

/**
 * Fetch runtime config from the API (client-side).
 * Caches the result to avoid multiple fetches.
 */
export async function fetchRuntimeConfig(): Promise<RuntimeConfig> {
  // Return cached config if available
  if (clientConfigCache) {
    return clientConfigCache;
  }

  // Return existing promise if fetch is in progress
  if (clientConfigPromise) {
    return clientConfigPromise;
  }

  // Start fetch
  clientConfigPromise = fetch('/api/runtime-config')
    .then((res) => {
      if (!res.ok) {
        throw new Error(`Failed to fetch runtime config: ${res.status}`);
      }
      return res.json();
    })
    .then((config: RuntimeConfig) => {
      clientConfigCache = config;
      return config;
    })
    .catch((error) => {
      console.error('Failed to fetch runtime config, using defaults:', error);
      clientConfigCache = defaultConfig;
      return defaultConfig;
    })
    .finally(() => {
      clientConfigPromise = null;
    });

  return clientConfigPromise;
}

/**
 * Get runtime config synchronously.
 * - Server-side: Returns config from process.env
 * - Client-side: Returns cached config or defaults (use fetchRuntimeConfig for async)
 */
export function getRuntimeConfig(): RuntimeConfig {
  if (typeof window === 'undefined') {
    // Server-side: read from process.env
    return getServerRuntimeConfig();
  }

  // Client-side: return cached config or defaults
  return clientConfigCache || defaultConfig;
}

/**
 * Check if runtime config has been loaded on the client.
 */
export function isRuntimeConfigLoaded(): boolean {
  if (typeof window === 'undefined') {
    return true; // Always available on server
  }
  return clientConfigCache !== null;
}

// Export default config for build-time usage
export { defaultConfig };
