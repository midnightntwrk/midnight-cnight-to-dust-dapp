/* eslint-disable */
'use client';
import { logger } from '@/lib/logger';

import { protocolParametersForLucid } from '@/config/protocolParameters';
import { CardanoNetwork } from '@/config/runtime-config';
import { useRuntimeConfig } from '@/contexts/RuntimeConfigContext';
import { useGenerationStatus } from '@/hooks/useGenerationStatus';
import { useRegistrationUtxo } from '@/hooks/useRegistrationUtxo';
import { getTotalOfUnitInUTxOList, getDustAddressBytes, validateDustAddress, getMidnightNetworkId } from '@/lib/utils';
import { Network, ProtocolParameters, UTxO } from '@lucid-evolution/lucid';
import { usePathname, useRouter } from 'next/navigation';
import React, { createContext, ReactNode, useContext, useEffect, useRef, useState, useCallback } from 'react';

/**
 * Initialize Lucid with Blockfrost provider (client-side only)
 * Uses runtime config for network selection
 */
async function initializeLucidWithBlockfrost(network: CardanoNetwork, apiServerUrl: string) {
  logger.log('[Network]', `initializeLucidWithBlockfrost for ${network}`);
  try {
    const protocolParameters = protocolParametersForLucid[network as keyof typeof protocolParametersForLucid] as ProtocolParameters;
    const { Lucid, Blockfrost } = await import('@lucid-evolution/lucid');

    const lucid = await Lucid(new Blockfrost(apiServerUrl + '/api/blockfrost', 'xxxx'), network as Network, {
      presetProtocolParameters: protocolParameters,
    });
    return lucid;
  } catch (error) {
    logger.log('[Network]', `initializeLucidWithBlockfrost - Error: ${error}`);
    throw error;
  }
}

// Network ID constants (these are fixed values, not runtime config)
const NETWORK_MAINNET_ID = 1;
const NETWORK_TESTNET_ID = 0;

export type SupportedWallet = 'nami' | 'eternl' | 'lace' | 'flint' | 'typhoncip30' | 'nufi' | 'gero' | 'ccvault';
export type SupportedMidnightWallet = string;

// Generation Status Types
export interface GenerationStatusData {
  cardanoRewardAddress: string;
  dustAddress: string | null;
  registered: boolean;
  nightBalance: string;
  generationRate: string;
  currentCapacity: string;
}

// Types
interface CardanoWalletState {
  isConnected: boolean;
  address: string | null;
  stakeKey: string | null;
  rewardAddress: string | null; // bech32 reward address (stake_test1... or stake1...)
  balanceADA: string | null;
  balanceNight: string | null;
  walletName: string | null;
  lucid: unknown | null;
  isLoading: boolean;
  error: string | null;
}

interface MidnightWalletState {
  isConnected: boolean;
  address: string | null;
  coinPublicKey: string | null;
  balance: string | null;
  walletName: string | null;
  api: unknown | null;
  isLoading: boolean;
  error: string | null;
  dustAddress: string | null; // Dust address from getDustAddress()
  dustBalance: string | null; // Dust balance from getDustBalance()
}

interface WalletContextType {
  // Cardano wallet state
  cardano: CardanoWalletState;
  // Midnight wallet state
  midnight: MidnightWalletState;
  // Auto-reconnect state
  isAutoReconnecting: boolean;
  // Cardano wallet methods
  connectCardanoWallet: (walletName: SupportedWallet) => Promise<void>;
  disconnectCardanoWallet: () => void;
  getAvailableCardanoWallets: () => SupportedWallet[];
  // Midnight wallet methods
  connectMidnightWallet: (walletName: SupportedMidnightWallet) => Promise<void>;
  disconnectMidnightWallet: () => void;
  getAvailableMidnightWallets: () => SupportedMidnightWallet[];
  setManualMidnightAddress: (address: string) => void;
  updateMidnightAddress: (address: string, coinPublicKey: string) => void;
  // Generation status state
  generationStatus: GenerationStatusData | null;
  isCheckingRegistration: boolean;
  registrationError: string | null;
  // Generation status methods
  refetchGenerationStatus: () => void;
  // Registration UTXO state
  registrationUtxo: UTxO | null;
  isLoadingRegistrationUtxo: boolean;
  registrationUtxoError: string | null;
  // Registration UTXO methods
  findRegistrationUtxo: () => Promise<void>;
  pollRegistrationUtxo: () => Promise<void>;
}

// Create context
const WalletContext = createContext<WalletContextType | undefined>(undefined);

// Provider component
export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { config, currentNetwork, isMainnet, isTestnet, getCnightPolicyId, getCnightEncodedName } = useRuntimeConfig();

  // Cardano wallet state
  const [cardanoState, setCardanoState] = useState<CardanoWalletState>({
    isConnected: false,
    address: null,
    stakeKey: null,
    rewardAddress: null,
    balanceADA: null,
    balanceNight: null,
    walletName: null,
    lucid: null,
    isLoading: false,
    error: null,
  });

  // Midnight wallet state
  const [midnightState, setMidnightState] = useState<MidnightWalletState>({
    isConnected: false,
    address: null,
    coinPublicKey: null,
    balance: null,
    walletName: null,
    api: null,
    isLoading: false,
    error: null,
    dustAddress: null,
    dustBalance: null,
  });

  // Auto-reconnect state
  const [isAutoReconnecting, setIsAutoReconnecting] = useState(true);

  // Track if we've already initialized to prevent re-running autoReconnect
  const hasInitializedRef = useRef(false);
  const isMountedRef = useRef(true);

  // Generation status hook - queries the Midnight indexer using reward address
  // This runs in parallel with the Blockfrost-based registration UTXO check
  const { data: generationStatus, isLoading: isCheckingRegistration, error: registrationError, refetch: refetchGenerationStatus } = useGenerationStatus(cardanoState.rewardAddress);

  // Registration UTXO hook
  const {
    registrationUtxo,
    isLoadingRegistrationUtxo,
    registrationUtxoError,
    refetch: findRegistrationUtxo,
    pollUntilFound: pollRegistrationUtxo,
  } = useRegistrationUtxo(cardanoState.address, midnightState.coinPublicKey);

  // Cardano wallet methods
  const getAvailableCardanoWallets = (): SupportedWallet[] => {
    if (typeof window === 'undefined') return [];

    const wallets: SupportedWallet[] = [];
    const supportedWallets: SupportedWallet[] = ['nami', 'eternl', 'lace', 'flint', 'typhoncip30', 'nufi', 'gero', 'ccvault'];

    supportedWallets.forEach((wallet) => {
      if (window.cardano?.[wallet]) {
        wallets.push(wallet);
      }
    });

    return wallets;
  };

  const connectCardanoWallet = async (walletName: SupportedWallet) => {
    try {
      setCardanoState((prev) => ({ ...prev, isLoading: true, error: null }));

      if (typeof window === 'undefined') {
        throw new Error('Client-side only feature');
      }

      if (!window.cardano?.[walletName]) {
        throw new Error(`${walletName} wallet not found. Please install it first.`);
      }

      // Initialize Lucid with Blockfrost using runtime configuration
      const apiServerUrl = config.REACT_SERVER_API_URL || '';
      const lucid = await initializeLucidWithBlockfrost(currentNetwork, apiServerUrl);

      // Connect to wallet
      const api = await window.cardano[walletName].enable();
      const networkId = await api.getNetworkId();

      if (isMainnet && networkId !== NETWORK_MAINNET_ID) {
        throw new Error(`Must connect with a ${currentNetwork} Cardano Wallet`);
      }
      if (isTestnet && networkId !== NETWORK_TESTNET_ID) {
        throw new Error(`Must connect with a ${currentNetwork} Testnet Cardano Wallet`);
      }

      // Select the wallet in Lucid directly with the API
      lucid.selectWallet.fromAPI(api);

      // Get wallet info
      const address = await lucid.wallet().address();
      const rewardAddress = await lucid.wallet().rewardAddress();

      const { getAddressDetails } = await import('@lucid-evolution/lucid');
      const cardanoAddressDetails = getAddressDetails(address);

      const cardanoPaymentCredentialHash = cardanoAddressDetails?.paymentCredential?.hash;
      const cardanoStakeKeyHash = cardanoAddressDetails?.stakeCredential?.hash;

      // Get reward address using lucid
      let stakeAddressBech32: string | null = null;
      try {
        const rewardAddress = await lucid.wallet().rewardAddress();
        stakeAddressBech32 = rewardAddress || null;
      } catch {
        stakeAddressBech32 = null;
      }

      logger.log('[Wallet]', '🔑 ========== CARDANO WALLET CONNECTED ==========');
      logger.log('[Wallet]', `📍 Address (bech32): ${address}`);
      logger.log('[Wallet]', `📍 Payment Credential (hash): ${cardanoPaymentCredentialHash}`);
      logger.log('[Wallet]', `🎯 Stake Key (hash): ${cardanoStakeKeyHash}`);
      logger.log('[Wallet]', `🎯 Stake Address (bech32): ${stakeAddressBech32}`);
      logger.log('[Wallet]', '🔑 ================================================');

      const utxos = await lucid.wallet().getUtxos();

      const tokenNightPolicy = getCnightPolicyId();
      const tokenNightEncodedName = getCnightEncodedName();

      const balanceNight = getTotalOfUnitInUTxOList(tokenNightPolicy + tokenNightEncodedName, utxos);
      // cNIGHT/NIGHT has 0 decimals, so no division needed (unlike ADA which has 6 decimals)
      const balanceNightStr = Number(balanceNight).toString();

      // Calculate balance (sum of all UTxOs)
      const balanceLovelace = utxos.reduce((acc, utxo) => acc + (utxo.assets?.lovelace || BigInt(0)), BigInt(0));
      const balanceInAdaStr = (Number(balanceLovelace) / 1_000_000).toFixed(6);

      setCardanoState({
        isConnected: true,
        address,
        stakeKey: cardanoStakeKeyHash || null,
        rewardAddress: rewardAddress || null,
        balanceADA: balanceInAdaStr,
        balanceNight: balanceNightStr,
        walletName,
        lucid, // from this variable we will execute all tx
        isLoading: false,
        error: null,
      });

      // Store connection in localStorage
      localStorage.setItem('connectedCardanoWallet', walletName);
    } catch (error) {
      logger.error('[Wallet]', 'Failed to connect Cardano wallet:', error);
      setCardanoState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to connect wallet',
      }));
    }
  };

  const disconnectCardanoWallet = () => {
    setCardanoState({
      isConnected: false,
      address: null,
      stakeKey: null,
      rewardAddress: null,
      balanceADA: null,
      balanceNight: null,
      walletName: null,
      lucid: null,
      isLoading: false,
      error: null,
    });
    localStorage.removeItem('connectedCardanoWallet');
  };

  // Midnight wallet methods
  const getAvailableMidnightWallets = (): SupportedMidnightWallet[] => {
    if (typeof window === 'undefined') return [];

    const wallets: SupportedMidnightWallet[] = [];

    // Dynamically discover available Midnight wallets from window.midnight
    if (window.midnight && typeof window.midnight === 'object') {
      Object.keys(window.midnight).forEach((walletKey) => {
        if (window.midnight?.[walletKey]) {
          wallets.push(walletKey);
        }
      });
    }

    return wallets;
  };

  const connectMidnightWallet = async (walletName: SupportedMidnightWallet) => {
    try {
      setMidnightState((prev) => ({ ...prev, isLoading: true, error: null }));

      if (typeof window === 'undefined') {
        throw new Error('Client-side only feature');
      }

      if (!window.midnight?.[walletName]) {
        throw new Error(`${walletName} Midnight wallet not found. Please install it first.`);
      }

      // Debug: Log what's available on the midnight wallet object
      const walletObj = window.midnight[walletName];
      logger.log('[Wallet]', 'Midnight wallet object:', {
        walletName,
        type: typeof walletObj,
        keys: walletObj ? Object.keys(walletObj) : [],
        hasConnect: typeof walletObj?.connect === 'function',
        apiVersion: walletObj?.apiVersion,
      });

      // Determine the Midnight network based on Cardano network
      const cardanoNetwork = currentNetwork.toLowerCase();
      const midnightNetwork = cardanoNetwork === 'mainnet' ? 'mainnet' : cardanoNetwork === 'preprod' ? 'preprod' : 'preview';

      logger.log('[Wallet]', 'Connecting to Midnight network:', { cardanoNetwork, midnightNetwork });

      // Connect to Midnight wallet using the new API (v4+)
      if (!walletObj || typeof walletObj.connect !== 'function') {
        throw new Error('Midnight wallet does not support the connect() method. Please ensure you are using a compatible wallet version.');
      }

      const api = await walletObj.connect(midnightNetwork);

      // Hint to the wallet which methods we'll be using
      if (api && typeof api.hintUsage === 'function') {
        try {
          api.hintUsage(['getDustBalance', 'getDustAddress']);
        } catch (error) {
          // hintUsage is optional, don't fail if it's not supported
          logger.debug('[Wallet]', 'hintUsage not supported or failed', error);
        }
      }

      logger.log('[Wallet]', 'Midnight API object:', {
        type: typeof api,
        keys: api ? Object.keys(api) : [],
        hasGetDustAddress: typeof api?.getDustAddress === 'function',
        hasGetDustBalance: typeof api?.getDustBalance === 'function',
      });

      // Get Dust address from Midnight API (v4+) - this is what we use for registration
      if (!api || typeof api.getDustAddress !== 'function') {
        throw new Error('Midnight API does not support getDustAddress(). Please ensure you are using a compatible wallet version.');
      }

      logger.log('[Wallet]', 'Using Midnight API (v4+) - getDustAddress()');
      const dustAddressResult = await api.getDustAddress();
      logger.log('[Wallet]', '📍 Dust Address Result:', dustAddressResult);

      // API returns {dustAddress: '...'} object, extract the string
      const dustAddress = dustAddressResult?.dustAddress;
      logger.log('[Wallet]', 'Extracted Dust address string:', dustAddress);

      if (!dustAddress) {
        throw new Error('Could not get Dust address from Midnight wallet. Please ensure your wallet is set up.');
      }

      // Convert Dust address from bech32m to bytes format (for registration)
      let coinPublicKey = null;
      if (dustAddress && typeof dustAddress === 'string') {
        const networkId = getMidnightNetworkId();
        coinPublicKey = getDustAddressBytes(dustAddress, networkId);
        logger.log('[Wallet]', '🔑 Converted Dust address to bytes:', coinPublicKey);
        logger.log('[Wallet]', '📋 Registration will use:', {
          dustAddress,
          coinPublicKey,
        });
      }

      // Get Dust balance
      let dustBalance: string | null = null;

      try {
        if (typeof api.getDustBalance === 'function') {
          logger.log('[Wallet]', 'Fetching Dust balance...');
          const dustBalanceResult = await api.getDustBalance();
          dustBalance = dustBalanceResult.balance.toString();
          logger.log('[Wallet]', '💰 Dust Balance:', {
            balance: dustBalance,
            cap: dustBalanceResult.cap.toString(),
            balanceBigInt: dustBalanceResult.balance,
            capBigInt: dustBalanceResult.cap,
          });
        } else {
          logger.warn('[Wallet]', 'getDustBalance() not available on Midnight API');
        }
      } catch (error) {
        logger.error('[Wallet]', 'Error fetching Dust balance:', error);
        // Don't throw - balance is optional for connection
      }

      // Use Dust address as the main address for this wallet connection
      const address = dustAddress;
      logger.log('[Wallet]', '✅ Final Midnight wallet data:', {
        address: dustAddress,
        coinPublicKey,
        dustBalance,
      });

      const balance = 'N/A (Shield address)';

      setMidnightState({
        isConnected: true,
        address: dustAddress, // Use Dust address as the main address
        coinPublicKey,
        balance,
        walletName,
        api,
        isLoading: false,
        error: null,
        dustAddress, // Store Dust address separately as well
        dustBalance,
      });

      // Store connection in localStorage
      localStorage.setItem('connectedMidnightWallet', walletName);
    } catch (error) {
      logger.error('[Wallet]', 'Failed to connect Midnight wallet:', error);
      setMidnightState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to connect Midnight wallet',
      }));
    }
  };

  const disconnectMidnightWallet = () => {
    setMidnightState({
      isConnected: false,
      address: null,
      coinPublicKey: null,
      balance: null,
      walletName: null,
      api: null,
      isLoading: false,
      error: null,
      dustAddress: null,
      dustBalance: null,
    });
    localStorage.removeItem('connectedMidnightWallet');
  };

  const setManualMidnightAddress = (address: string) => {
    // Validate that it's a valid Dust address first
    const networkId = getMidnightNetworkId();
    if (!validateDustAddress(address, networkId)) {
      logger.error('[Wallet]', 'Invalid Dust address format', { address, networkId });
      setMidnightState({
        isConnected: false,
        address: null,
        coinPublicKey: null,
        balance: null,
        walletName: null,
        api: null,
        isLoading: false,
        error: 'Invalid Midnight Dust address format',
        dustAddress: null,
        dustBalance: null,
      });
      return;
    }

    // Convert Dust address from bech32m to bytes format
    const coinPublicKey = getDustAddressBytes(address, networkId);

    if (!coinPublicKey) {
      logger.error('[Wallet]', 'Failed to convert Dust address to bytes');
      setMidnightState({
        isConnected: false,
        address: null,
        coinPublicKey: null,
        balance: null,
        walletName: null,
        api: null,
        isLoading: false,
        error: 'Failed to convert Dust address to bytes',
        dustAddress: null,
        dustBalance: null,
      });
      return;
    }

    setMidnightState({
      isConnected: true,
      address: address,
      coinPublicKey: coinPublicKey, // Use extracted coin public key
      balance: 'Manual Address',
      walletName: 'Manual',
      api: null,
      isLoading: false,
      error: null,
      dustAddress: null, // Manual address doesn't have wallet API access
      dustBalance: null, // Manual address doesn't have wallet API access
    });
  };

  /**
   * Updates the Midnight wallet state with a new address and coin public key.
   * Used after update transactions to keep app state in sync with on-chain data.
   */
  const updateMidnightAddress = (address: string, coinPublicKey: string) => {
    logger.log('[Wallet]', 'Updating Midnight address in state', {
      newAddress: address,
      newCoinPublicKey: coinPublicKey,
    });

    setMidnightState({
      isConnected: true,
      address: address,
      coinPublicKey: coinPublicKey,
      balance: midnightState.balance, // Preserve existing balance
      walletName: 'Manual', // Updated addresses are treated as manual
      api: null,
      isLoading: false,
      error: null,
      dustAddress: null, // Updated addresses are treated as manual, no wallet API access
      dustBalance: null, // Updated addresses are treated as manual, no wallet API access
    });

    logger.log('✅ Midnight wallet state updated successfully');
  };

  // Auto-reconnect on page load (only once per session)
  useEffect(() => {
    isMountedRef.current = true;

    // Only auto-reconnect once on initial mount
    if (hasInitializedRef.current) {
      return;
    }

    const autoReconnect = async () => {
      if (!isMountedRef.current) return;

      setIsAutoReconnecting(true);
      hasInitializedRef.current = true; // Mark as initialized

      // Auto-reconnect Cardano wallet
      const savedCardanoWallet = localStorage.getItem('connectedCardanoWallet') as SupportedWallet;
      if (savedCardanoWallet && window.cardano?.[savedCardanoWallet] && isMountedRef.current) {
        await connectCardanoWallet(savedCardanoWallet);
      }

      // Auto-reconnect Midnight wallet
      const savedMidnightWallet = localStorage.getItem('connectedMidnightWallet') as SupportedMidnightWallet;
      if (savedMidnightWallet && window.midnight?.[savedMidnightWallet] && isMountedRef.current) {
        await connectMidnightWallet(savedMidnightWallet);
      }

      if (isMountedRef.current) {
        setIsAutoReconnecting(false);
      }
    };

    autoReconnect();

    // Cleanup: mark as unmounted
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Centralized redirect logic based on registration status
  useEffect(() => {
    // Guard: Don't redirect while still loading or during auto-reconnect
    if (isAutoReconnecting || isLoadingRegistrationUtxo) {
      logger.log('⏸️  Skipping redirect - still loading...');
      return;
    }

    // Guard: Only redirect if Cardano wallet is connected
    if (!cardanoState.isConnected) {
      logger.log('⏸️  Skipping redirect - Cardano wallet not connected');
      return;
    }

    // Guard: Only redirect if component is still mounted
    if (!isMountedRef.current) {
      return;
    }

    // User IS registered (has registrationUtxo)
    if (registrationUtxo) {
      if (pathname !== '/dashboard') {
        logger.log('🎯 User is registered, redirecting to dashboard...');
        router.push('/dashboard');
      }
    }
    // User is NOT registered (no registrationUtxo)
    else {
      // If user is on dashboard but not registered, redirect to home
      if (pathname === '/dashboard') {
        logger.log('🏠 User is not registered, redirecting to home...');
        router.push('/');
      }
    }
  }, [cardanoState.isConnected, midnightState, registrationUtxo, isLoadingRegistrationUtxo, isAutoReconnecting, pathname, router]);

  // Auto-redirect to dashboard if user is already registered
  // useEffect(() => {
  //     logger.log('🔍 Redirect check:', {
  //         cardanoConnected: cardanoState.isConnected,
  //         isCheckingRegistration,
  //         generationStatus,
  //         isRegistered: generationStatus?.isRegistered,
  //         registrationUtxo,
  //         isLoadingRegistrationUtxo,
  //         pathname,
  //     });

  //     // TODO: When indexer back, add again:  && !isCheckingRegistration && generationStatus?.isRegistered
  //     if (cardanoState.isConnected && !isLoadingRegistrationUtxo && registrationUtxo) {
  //         if (pathname !== '/dashboard') {
  //             logger.log('🎯 User is already registered, redirecting to dashboard...');
  //             router.push('/dashboard');
  //         }
  //     }
  //     if (cardanoState.isConnected && !isLoadingRegistrationUtxo && !registrationUtxo) {
  //         if (pathname !== '/onboard') {
  //             logger.log('🎯 User is not registered, redirecting to onboard...');
  //             router.push('/onboard');
  //         }
  //     }
  // }, [cardanoState.isConnected, isCheckingRegistration, generationStatus, registrationUtxo, isLoadingRegistrationUtxo, router, pathname]);

  const contextValue: WalletContextType = {
    cardano: cardanoState,
    midnight: midnightState,
    isAutoReconnecting,
    connectCardanoWallet,
    disconnectCardanoWallet,
    getAvailableCardanoWallets,
    connectMidnightWallet,
    disconnectMidnightWallet,
    getAvailableMidnightWallets,
    setManualMidnightAddress,
    updateMidnightAddress,
    generationStatus,
    isCheckingRegistration,
    registrationError,
    refetchGenerationStatus,
    registrationUtxo,
    isLoadingRegistrationUtxo,
    registrationUtxoError,
    findRegistrationUtxo,
    pollRegistrationUtxo,
  };

  return <WalletContext.Provider value={contextValue}>{children}</WalletContext.Provider>;
};

// Custom hook to use the wallet context
export const useWalletContext = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWalletContext must be used within a WalletProvider');
  }
  return context;
};

// Export types for use in other components
export type { CardanoWalletState, MidnightWalletState, WalletContextType };
