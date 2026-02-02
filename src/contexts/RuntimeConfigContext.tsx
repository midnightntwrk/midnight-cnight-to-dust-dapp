'use client';

/**
 * Runtime Configuration Context
 *
 * Provides runtime configuration to client components.
 * Fetches config from /api/runtime-config on mount.
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  RuntimeConfig,
  CardanoNetwork,
  fetchRuntimeConfig,
  getRuntimeConfig,
  isRuntimeConfigLoaded,
} from '@/config/runtime-config';

interface RuntimeConfigContextValue {
  config: RuntimeConfig;
  isLoading: boolean;
  error: Error | null;
  // Derived values for convenience
  currentNetwork: CardanoNetwork;
  isMainnet: boolean;
  isTestnet: boolean;
  isPreview: boolean;
  isPreprod: boolean;
  // Network-specific getters
  getBlockfrostUrl: () => string;
  getBlockchainExplorerUrl: () => string;
  getCnightPolicyId: () => string;
  getCnightEncodedName: () => string;
  getCardanoScanUrl: (type: 'transaction' | 'address' | 'policy', id: string) => string;
}

const RuntimeConfigContext = createContext<RuntimeConfigContextValue | null>(null);

interface RuntimeConfigProviderProps {
  children: ReactNode;
}

export function RuntimeConfigProvider({ children }: RuntimeConfigProviderProps) {
  const [config, setConfig] = useState<RuntimeConfig>(getRuntimeConfig);
  const [isLoading, setIsLoading] = useState(!isRuntimeConfigLoaded());
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Fetch config on client mount
    if (typeof window !== 'undefined' && !isRuntimeConfigLoaded()) {
      fetchRuntimeConfig()
        .then((fetchedConfig) => {
          setConfig(fetchedConfig);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error('Failed to load runtime config:', err);
          setError(err);
          setIsLoading(false);
        });
    }
  }, []);

  // Derived values
  const currentNetwork = config.CARDANO_NET;
  const isMainnet = currentNetwork === 'Mainnet';
  const isTestnet = ['Preview', 'Preprod', 'Emulator', 'Custom'].includes(currentNetwork);
  const isPreview = currentNetwork === 'Preview';
  const isPreprod = currentNetwork === 'Preprod';

  // Network-specific getters
  const getBlockfrostUrl = (): string => {
    switch (currentNetwork) {
      case 'Mainnet':
        return config.BLOCKFROST_URL_MAINNET;
      case 'Preprod':
        return config.BLOCKFROST_URL_PREPROD;
      case 'Preview':
      default:
        return config.BLOCKFROST_URL_PREVIEW;
    }
  };

  const getBlockchainExplorerUrl = (): string => {
    switch (currentNetwork) {
      case 'Mainnet':
        return config.BLOCKCHAIN_EXPLORER_URL_MAINNET;
      case 'Preprod':
        return config.BLOCKCHAIN_EXPLORER_URL_PREPROD;
      case 'Preview':
      default:
        return config.BLOCKCHAIN_EXPLORER_URL_PREVIEW;
    }
  };

  const getCnightPolicyId = (): string => {
    switch (currentNetwork) {
      case 'Mainnet':
        return config.MAINNET_CNIGHT_CURRENCY_POLICY_ID;
      case 'Preprod':
        return config.PREPROD_CNIGHT_CURRENCY_POLICY_ID;
      case 'Preview':
      default:
        return config.PREVIEW_CNIGHT_CURRENCY_POLICY_ID;
    }
  };

  const getCnightEncodedName = (): string => {
    switch (currentNetwork) {
      case 'Mainnet':
        return config.MAINNET_CNIGHT_CURRENCY_ENCODEDNAME;
      case 'Preprod':
        return config.PREPROD_CNIGHT_CURRENCY_ENCODEDNAME;
      case 'Preview':
      default:
        return config.PREVIEW_CNIGHT_CURRENCY_ENCODEDNAME;
    }
  };

  const getCardanoScanUrl = (type: 'transaction' | 'address' | 'policy', id: string): string => {
    const baseUrl = getBlockchainExplorerUrl();
    const subPathMap: Record<'transaction' | 'address' | 'policy', string> = {
      transaction: 'tx',
      address: 'addr',
      policy: 'policy',
    };
    return `${baseUrl}/${subPathMap[type]}/${id}`;
  };

  const value: RuntimeConfigContextValue = {
    config,
    isLoading,
    error,
    currentNetwork,
    isMainnet,
    isTestnet,
    isPreview,
    isPreprod,
    getBlockfrostUrl,
    getBlockchainExplorerUrl,
    getCnightPolicyId,
    getCnightEncodedName,
    getCardanoScanUrl,
  };

  return <RuntimeConfigContext.Provider value={value}>{children}</RuntimeConfigContext.Provider>;
}

/**
 * Hook to access runtime configuration.
 * Must be used within RuntimeConfigProvider.
 */
export function useRuntimeConfig(): RuntimeConfigContextValue {
  const context = useContext(RuntimeConfigContext);
  if (!context) {
    throw new Error('useRuntimeConfig must be used within RuntimeConfigProvider');
  }
  return context;
}

/**
 * Hook that returns config only when loaded.
 * Returns null while loading.
 */
export function useRuntimeConfigWhenReady(): RuntimeConfigContextValue | null {
  const context = useContext(RuntimeConfigContext);
  if (!context || context.isLoading) {
    return null;
  }
  return context;
}
