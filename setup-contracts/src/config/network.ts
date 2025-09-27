/**
 * Centralized network configuration
 * Dynamically sets constants based on NEXT_PUBLIC_CARDANO_NET environment variable
 */

import { Network } from '@lucid-evolution/lucid';

export type CardanoNetwork = 'Mainnet' | 'Preview' | 'Preprod' | 'Emulator' | 'Custom';

interface NetworkConfig {
    BLOCKFROST_URL: string;
    BLOCKCHAIN_EXPLORER_URL: string;
    BLOCKFROST_KEY: string | undefined;
}

const networkConfigs: Record<CardanoNetwork, NetworkConfig> = {
    Mainnet: {
        BLOCKFROST_URL: process.env.NEXT_PUBLIC_BLOCKFROST_URL_MAINNET || 'https://cardano-mainnet.blockfrost.io/api/v0',
        BLOCKCHAIN_EXPLORER_URL: process.env.NEXT_PUBLIC_BLOCKCHAIN_EXPLORER_URL_MAINNET || 'https://cexplorer.io/',
        BLOCKFROST_KEY: process.env.NEXT_PUBLIC_BLOCKFROST_KEY_MAINNET,
    },
    Preview: {
        BLOCKFROST_URL: process.env.NEXT_PUBLIC_BLOCKFROST_URL_PREVIEW || 'https://cardano-preview.blockfrost.io/api/v0',
        BLOCKCHAIN_EXPLORER_URL: process.env.NEXT_PUBLIC_BLOCKCHAIN_EXPLORER_URL_PREVIEW || 'https://preview.cexplorer.io/',
        BLOCKFROST_KEY: process.env.NEXT_PUBLIC_BLOCKFROST_KEY_PREVIEW,
    },
    Preprod: {
        BLOCKFROST_URL: process.env.NEXT_PUBLIC_BLOCKFROST_URL_PREPROD || 'https://cardano-preprod.blockfrost.io/api/v0',
        BLOCKCHAIN_EXPLORER_URL: process.env.NEXT_PUBLIC_BLOCKCHAIN_EXPLORER_URL_PREPROD || 'https://preprod.cexplorer.io/',
        BLOCKFROST_KEY: process.env.NEXT_PUBLIC_BLOCKFROST_KEY_PREPROD,
    },
    Emulator: {
        BLOCKFROST_URL: 'http://localhost:3001',
        BLOCKCHAIN_EXPLORER_URL: 'http://localhost:3001/',
        BLOCKFROST_KEY: '', // Emulator doesn't need API key
    },
    Custom: {
        BLOCKFROST_URL: process.env.NEXT_PUBLIC_BLOCKFROST_URL_CUSTOM || '',
        BLOCKCHAIN_EXPLORER_URL: process.env.NEXT_PUBLIC_BLOCKCHAIN_EXPLORER_URL_CUSTOM || '',
        BLOCKFROST_KEY: '',
    },
};

// Get current network from environment
const getCurrentNetwork = (): CardanoNetwork => {
    const network = process.env.NEXT_PUBLIC_CARDANO_NET as CardanoNetwork;
    if (!network || !networkConfigs[network]) {
        console.warn(`Invalid or missing NEXT_PUBLIC_CARDANO_NET: ${network}. Defaulting to Preview.`);
        return 'Preview';
    }
    return network;
};

// Get current network configuration
const getCurrentNetworkConfig = (): NetworkConfig => {
    const network = getCurrentNetwork();
    const config = networkConfigs[network];
    
    if (!config.BLOCKFROST_KEY) {
        throw new Error(`Missing required environment variable: BLOCKFROST_KEY for network: ${network}`);
    }
    
    return config;
};

// Export current network constants
const config = getCurrentNetworkConfig();

export const BLOCKFROST_URL = config.BLOCKFROST_URL;
export const BLOCKCHAIN_EXPLORER_URL = config.BLOCKCHAIN_EXPLORER_URL;
export const BLOCKFROST_KEY = config.BLOCKFROST_KEY;

// Convert CardanoNetwork to LucidNetwork
export const getLucidNetwork = (): Network => {
    const network = getCurrentNetwork();
    // Map Emulator and Custom to Preprod for Lucid compatibility
    if (network === 'Emulator' || network === 'Custom') {
        return 'Custom';
    }
    return network as Network;
};

// Export utility functions
export { getCurrentNetwork, getCurrentNetworkConfig, networkConfigs };

// Helper function to get CardanoScan URL for current network
export const getCardanoScanUrl = (type: 'transaction' | 'address' | 'policy', id: string): string => {
    const network = getCurrentNetwork();
    let baseUrl: string;

    switch (network) {
        case 'Mainnet':
            baseUrl = 'https://cardanoscan.io';
            break;
        case 'Preview':
            baseUrl = 'https://preview.cardanoscan.io';
            break;
        case 'Preprod':
            baseUrl = 'https://preprod.cardanoscan.io';
            break;
        default:
            // For Emulator and Custom, fallback to preprod
            baseUrl = 'https://preprod.cardanoscan.io';
            break;
    }

    return `${baseUrl}/${type}/${id}`;
};
