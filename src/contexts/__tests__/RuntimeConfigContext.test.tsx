import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import type { RuntimeConfig } from '@/config/runtime-config';

// Store a mutable reference to the config
let currentConfig: RuntimeConfig;

const baseConfig: RuntimeConfig = {
  CARDANO_NET: 'Preview',
  BLOCKFROST_URL_PREVIEW: 'https://cardano-preview.blockfrost.io/api/v0',
  BLOCKFROST_URL_PREPROD: 'https://cardano-preprod.blockfrost.io/api/v0',
  BLOCKFROST_URL_MAINNET: 'https://cardano-mainnet.blockfrost.io/api/v0',
  BLOCKCHAIN_EXPLORER_URL_PREVIEW: 'https://preview.cexplorer.io',
  BLOCKCHAIN_EXPLORER_URL_PREPROD: 'https://preprod.cexplorer.io',
  BLOCKCHAIN_EXPLORER_URL_MAINNET: 'https://cexplorer.io',
  PREVIEW_CNIGHT_CURRENCY_POLICY_ID: 'preview_policy_id',
  PREPROD_CNIGHT_CURRENCY_POLICY_ID: 'preprod_policy_id',
  MAINNET_CNIGHT_CURRENCY_POLICY_ID: 'mainnet_policy_id',
  PREVIEW_CNIGHT_CURRENCY_ENCODEDNAME: 'preview_encoded',
  PREPROD_CNIGHT_CURRENCY_ENCODEDNAME: 'preprod_encoded',
  MAINNET_CNIGHT_CURRENCY_ENCODEDNAME: 'mainnet_encoded',
  INDEXER_ENDPOINT_PREVIEW: 'https://indexer.preview.midnight.network/api/v3/graphql',
  INDEXER_ENDPOINT_PREPROD: 'https://indexer.preprod.midnight.network/api/v3/graphql',
  INDEXER_ENDPOINT_MAINNET: 'https://indexer.midnight.network/api/v3/graphql',
  REACT_SERVER_API_URL: '',
  REACT_SERVER_URL: '',
  SIMULATION_MODE: 'false',
};

vi.mock('@/config/runtime-config', () => ({
  getRuntimeConfig: () => currentConfig,
  fetchRuntimeConfig: () => Promise.resolve(currentConfig),
  isRuntimeConfigLoaded: () => true,
}));

import { RuntimeConfigProvider, useRuntimeConfig, useRuntimeConfigWhenReady } from '../RuntimeConfigContext';

const makeWrapper = (overrides?: Partial<RuntimeConfig>) => {
  currentConfig = { ...baseConfig, ...overrides };
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <RuntimeConfigProvider>{children}</RuntimeConfigProvider>;
  }
  return Wrapper;
};

describe('RuntimeConfigContext', () => {
  beforeEach(() => {
    currentConfig = { ...baseConfig };
  });

  describe('derived booleans', () => {
    it('isMainnet should be true for Mainnet', () => {
      const wrapper = makeWrapper({ CARDANO_NET: 'Mainnet' });
      const { result } = renderHook(() => useRuntimeConfig(), { wrapper });
      expect(result.current.isMainnet).toBe(true);
      expect(result.current.isTestnet).toBe(false);
    });

    it('isTestnet should be true for Preview', () => {
      const wrapper = makeWrapper({ CARDANO_NET: 'Preview' });
      const { result } = renderHook(() => useRuntimeConfig(), { wrapper });
      expect(result.current.isTestnet).toBe(true);
      expect(result.current.isMainnet).toBe(false);
    });

    it('isTestnet should be true for Preprod', () => {
      const wrapper = makeWrapper({ CARDANO_NET: 'Preprod' });
      const { result } = renderHook(() => useRuntimeConfig(), { wrapper });
      expect(result.current.isTestnet).toBe(true);
    });

    it('isPreview should be true for Preview', () => {
      const wrapper = makeWrapper({ CARDANO_NET: 'Preview' });
      const { result } = renderHook(() => useRuntimeConfig(), { wrapper });
      expect(result.current.isPreview).toBe(true);
      expect(result.current.isPreprod).toBe(false);
    });

    it('isPreprod should be true for Preprod', () => {
      const wrapper = makeWrapper({ CARDANO_NET: 'Preprod' });
      const { result } = renderHook(() => useRuntimeConfig(), { wrapper });
      expect(result.current.isPreprod).toBe(true);
      expect(result.current.isPreview).toBe(false);
    });
  });

  describe('getBlockfrostUrl', () => {
    it('should return Preview URL for Preview network', () => {
      const wrapper = makeWrapper({ CARDANO_NET: 'Preview' });
      const { result } = renderHook(() => useRuntimeConfig(), { wrapper });
      expect(result.current.getBlockfrostUrl()).toBe('https://cardano-preview.blockfrost.io/api/v0');
    });

    it('should return Preprod URL for Preprod network', () => {
      const wrapper = makeWrapper({ CARDANO_NET: 'Preprod' });
      const { result } = renderHook(() => useRuntimeConfig(), { wrapper });
      expect(result.current.getBlockfrostUrl()).toBe('https://cardano-preprod.blockfrost.io/api/v0');
    });

    it('should return Mainnet URL for Mainnet network', () => {
      const wrapper = makeWrapper({ CARDANO_NET: 'Mainnet' });
      const { result } = renderHook(() => useRuntimeConfig(), { wrapper });
      expect(result.current.getBlockfrostUrl()).toBe('https://cardano-mainnet.blockfrost.io/api/v0');
    });
  });

  describe('getBlockchainExplorerUrl', () => {
    it('should return Preview explorer URL', () => {
      const wrapper = makeWrapper({ CARDANO_NET: 'Preview' });
      const { result } = renderHook(() => useRuntimeConfig(), { wrapper });
      expect(result.current.getBlockchainExplorerUrl()).toBe('https://preview.cexplorer.io');
    });

    it('should return Mainnet explorer URL', () => {
      const wrapper = makeWrapper({ CARDANO_NET: 'Mainnet' });
      const { result } = renderHook(() => useRuntimeConfig(), { wrapper });
      expect(result.current.getBlockchainExplorerUrl()).toBe('https://cexplorer.io');
    });
  });

  describe('getCardanoScanUrl', () => {
    it('should build transaction URL', () => {
      const wrapper = makeWrapper({ CARDANO_NET: 'Preview' });
      const { result } = renderHook(() => useRuntimeConfig(), { wrapper });
      expect(result.current.getCardanoScanUrl('transaction', 'tx123')).toBe(
        'https://preview.cexplorer.io/tx/tx123'
      );
    });

    it('should build address URL', () => {
      const wrapper = makeWrapper({ CARDANO_NET: 'Preview' });
      const { result } = renderHook(() => useRuntimeConfig(), { wrapper });
      expect(result.current.getCardanoScanUrl('address', 'addr123')).toBe(
        'https://preview.cexplorer.io/addr/addr123'
      );
    });

    it('should build policy URL', () => {
      const wrapper = makeWrapper({ CARDANO_NET: 'Preview' });
      const { result } = renderHook(() => useRuntimeConfig(), { wrapper });
      expect(result.current.getCardanoScanUrl('policy', 'policy123')).toBe(
        'https://preview.cexplorer.io/policy/policy123'
      );
    });
  });

  describe('getCnightPolicyId', () => {
    it('should return Preview policy ID', () => {
      const wrapper = makeWrapper({ CARDANO_NET: 'Preview' });
      const { result } = renderHook(() => useRuntimeConfig(), { wrapper });
      expect(result.current.getCnightPolicyId()).toBe('preview_policy_id');
    });

    it('should return Mainnet policy ID', () => {
      const wrapper = makeWrapper({ CARDANO_NET: 'Mainnet' });
      const { result } = renderHook(() => useRuntimeConfig(), { wrapper });
      expect(result.current.getCnightPolicyId()).toBe('mainnet_policy_id');
    });

    it('should return Preprod policy ID', () => {
      const wrapper = makeWrapper({ CARDANO_NET: 'Preprod' });
      const { result } = renderHook(() => useRuntimeConfig(), { wrapper });
      expect(result.current.getCnightPolicyId()).toBe('preprod_policy_id');
    });
  });

  describe('getIndexerEndpoint', () => {
    it('should return Preview indexer endpoint', () => {
      const wrapper = makeWrapper({ CARDANO_NET: 'Preview' });
      const { result } = renderHook(() => useRuntimeConfig(), { wrapper });
      expect(result.current.getIndexerEndpoint()).toBe('https://indexer.preview.midnight.network/api/v3/graphql');
    });

    it('should return Mainnet indexer endpoint', () => {
      const wrapper = makeWrapper({ CARDANO_NET: 'Mainnet' });
      const { result } = renderHook(() => useRuntimeConfig(), { wrapper });
      expect(result.current.getIndexerEndpoint()).toBe('https://indexer.midnight.network/api/v3/graphql');
    });
  });

  describe('useRuntimeConfig outside provider', () => {
    it('should throw when used outside RuntimeConfigProvider', () => {
      // renderHook captures errors; check result.current is null or throws
      const { result } = renderHook(() => {
        try {
          return useRuntimeConfig();
        } catch (e) {
          return e;
        }
      });
      expect(result.current).toBeInstanceOf(Error);
      expect((result.current as Error).message).toBe('useRuntimeConfig must be used within RuntimeConfigProvider');
    });
  });

  describe('useRuntimeConfigWhenReady', () => {
    it('should return null when used outside provider', () => {
      const { result } = renderHook(() => useRuntimeConfigWhenReady());
      expect(result.current).toBeNull();
    });

    it('should return context when loaded', () => {
      const wrapper = makeWrapper();
      const { result } = renderHook(() => useRuntimeConfigWhenReady(), { wrapper });
      expect(result.current).not.toBeNull();
      expect(result.current!.currentNetwork).toBe('Preview');
    });
  });
});
