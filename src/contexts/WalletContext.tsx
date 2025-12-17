/* eslint-disable */
'use client';
import { logger } from '@/lib/logger';

import {
    CNIGHT_CURRENCY_ENCODEDNAME,
    CNIGHT_CURRENCY_POLICY_ID,
    getCurrentNetwork,
    initializeLucidWithBlockfrostClientSide,
    isMainnet,
    isTestnet,
    NETWORK_MAINNET_ID,
    NETWORK_TESTNET_ID,
} from '@/config/network';
import { useGenerationStatus } from '@/hooks/useGenerationStatus';
import { useRegistrationUtxo } from '@/hooks/useRegistrationUtxo';
import { getTotalOfUnitInUTxOList } from '@/lib/utils';
import { UTxO } from '@lucid-evolution/lucid';
import { usePathname, useRouter } from 'next/navigation';
import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';

export type SupportedWallet = 'nami' | 'eternl' | 'lace' | 'flint' | 'typhoncip30' | 'nufi' | 'gero' | 'ccvault';
export type SupportedMidnightWallet = 'mnLace';

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
    });

    // Auto-reconnect state
    const [isAutoReconnecting, setIsAutoReconnecting] = useState(true);

    // Track if we've already initialized to prevent re-running autoReconnect
    const hasInitializedRef = useRef(false);

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

            // Initialize Lucid with Blockfrost using centralized configuration
            const lucid = await initializeLucidWithBlockfrostClientSide();

            // Connect to wallet
            const api = await window.cardano[walletName].enable();
            const networkId = await api.getNetworkId();

            if (isMainnet && networkId !== NETWORK_MAINNET_ID) {
                throw new Error(`Must connect with a ${getCurrentNetwork()} Cardano Wallet`);
            }
            if (isTestnet && networkId !== NETWORK_TESTNET_ID) {
                throw new Error(`Must connect with a ${getCurrentNetwork()} Testnet Cardano Wallet`);
            }

            // Select the wallet in Lucid directly with the API
            lucid.selectWallet.fromAPI(api);

            // Get wallet info
            const address = await lucid.wallet().address();
            const rewardAddress = await lucid.wallet().rewardAddress();

            const { getAddressDetails } = await import('@lucid-evolution/lucid');
            const cardanoAddressDetails = getAddressDetails(address);

            const cardanoStakeKey = cardanoAddressDetails?.stakeCredential?.hash;

            logger.log('[Wallet]', 'Cardano wallet details:', {
                address,
                rewardAddress,
                stakeKey: cardanoStakeKey,
            });

            const utxos = await lucid.wallet().getUtxos();

            const tokenNightPolicy = CNIGHT_CURRENCY_POLICY_ID;
            const tokenNightEncodedName = CNIGHT_CURRENCY_ENCODEDNAME;

            const balanceNight = getTotalOfUnitInUTxOList(tokenNightPolicy + tokenNightEncodedName, utxos);
            const balanceNightStr = (Number(balanceNight) / 1_000_000).toFixed(6);

            // Calculate balance (sum of all UTxOs)
            const balanceLovelace = utxos.reduce((acc, utxo) => acc + (utxo.assets?.lovelace || BigInt(0)), BigInt(0));
            const balanceInAdaStr = (Number(balanceLovelace) / 1_000_000).toFixed(6);

            setCardanoState({
                isConnected: true,
                address,
                stakeKey: cardanoStakeKey || null,
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
        const supportedWallets: SupportedMidnightWallet[] = ['mnLace'];

        supportedWallets.forEach((wallet) => {
            if (window.midnight?.[wallet]) {
                wallets.push(wallet);
            }
        });

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
                hasEnable: typeof walletObj?.enable === 'function',
                hasConnect: typeof (walletObj as any)?.connect === 'function',
                prototype: walletObj ? Object.getOwnPropertyNames(Object.getPrototypeOf(walletObj)) : [],
            });

            // Determine the Midnight network based on Cardano network
            const cardanoNetwork = getCurrentNetwork().toLowerCase();
            const midnightNetwork = cardanoNetwork === 'mainnet' ? 'mainnet' : 'preview';

            logger.log('[Wallet]', 'Connecting to Midnight network:', { cardanoNetwork, midnightNetwork });

            // Connect to Midnight wallet - try different API patterns
            let api;
            if (typeof (walletObj as any).connect === 'function') {
                // New API (v4+): uses connect() method with network parameter
                logger.log('[Wallet]', 'Using connect() method (v4+ API)');
                api = await (walletObj as any).connect(midnightNetwork);
            } else if (typeof walletObj.enable === 'function') {
                // Legacy API: uses enable() method
                logger.log('[Wallet]', 'Using enable() method (legacy API)');
                api = await walletObj.enable();
            } else if (typeof walletObj === 'function') {
                // Some wallets expose the connector as a function
                logger.log('[Wallet]', 'Wallet object is a function, calling it');
                api = await (walletObj as any)();
            } else {
                // The wallet object might already be the API
                logger.log('[Wallet]', 'Using wallet object directly as API');
                api = walletObj;
            }

            logger.log('[Wallet]', 'Midnight API object:', {
                type: typeof api,
                keys: api ? Object.keys(api) : [],
                hasGetUnshieldedAddress: typeof api?.getUnshieldedAddress === 'function',
                hasState: typeof api?.state === 'function',
            });

            // Get wallet state from Midnight API - handle different API patterns
            let address = null;
            let coinPublicKey = null;

            if (typeof api?.getUnshieldedAddress === 'function') {
                // New API (v4+): use getUnshieldedAddress()
                logger.log('[Wallet]', 'Using new Midnight API (v4+) - getUnshieldedAddress()');

                const unshieldedAddressResult = await api.getUnshieldedAddress();
                logger.log('[Wallet]', 'Unshielded address result:', unshieldedAddressResult);

                // API returns {unshieldedAddress: '...'} object, extract the string
                address = typeof unshieldedAddressResult === 'string'
                    ? unshieldedAddressResult
                    : unshieldedAddressResult?.unshieldedAddress;

                logger.log('[Wallet]', 'Extracted address string:', address);

                // Extract coin public key from the address
                if (address && typeof address === 'string') {
                    const { extractCoinPublicKeyFromMidnightAddress } = require('@/lib/utils');
                    coinPublicKey = extractCoinPublicKeyFromMidnightAddress(address);
                    logger.log('[Wallet]', 'Extracted coinPublicKey from address:', coinPublicKey);
                }
            } else if (typeof api?.state === 'function') {
                // Legacy API: state is a function
                const walletState = await api.state();
                logger.log('[Wallet]', 'Midnight Wallet State (from function):', walletState);
                address = walletState?.address || null;
                coinPublicKey = walletState?.coinPublicKeyLegacy || walletState?.coinPublicKey || null;
            } else if (api?.state && typeof api.state === 'object') {
                // Alternative: state is already an object
                const walletState = api.state;
                logger.log('[Wallet]', 'Midnight Wallet State (from property):', walletState);
                address = walletState?.address || null;
                coinPublicKey = walletState?.coinPublicKeyLegacy || walletState?.coinPublicKey || null;
            } else {
                // Log all available properties for debugging
                logger.error('[Wallet]', 'Unknown Midnight API structure. Available properties:', {
                    keys: Object.keys(api || {}),
                    prototype: Object.getOwnPropertyNames(Object.getPrototypeOf(api || {})),
                    stringified: JSON.stringify(api, null, 2),
                });
                throw new Error('Unable to get wallet state from Midnight API. The wallet extension may have been updated.');
            }

            logger.log('[Wallet]', 'Extracted Midnight wallet data:', { address, coinPublicKey });

            if (!address) {
                throw new Error('Could not get address from Midnight wallet. Please ensure your wallet is set up.');
            }

            const balance = 'N/A (Shield address)';

            // Verify if coinPublicKeyLegacy matches the address
            // Also test extraction to ensure it works correctly
            const { extractCoinPublicKeyFromMidnightAddress } = require('@/lib/utils');
            const extractedKey = address ? extractCoinPublicKeyFromMidnightAddress(address) : null;

            setMidnightState({
                isConnected: true,
                address,
                coinPublicKey,
                balance,
                walletName,
                api,
                isLoading: false,
                error: null,
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
        });
        localStorage.removeItem('connectedMidnightWallet');
    };

    const setManualMidnightAddress = (address: string) => {
        // Extract coin public key from the Midnight address
        const { extractCoinPublicKeyFromMidnightAddress } = require('@/lib/utils');
        const coinPublicKey = extractCoinPublicKeyFromMidnightAddress(address);

        if (!coinPublicKey) {
            logger.error('[Wallet]', 'Failed to extract coin public key from manual address');
            setMidnightState({
                isConnected: false,
                address: null,
                coinPublicKey: null,
                balance: null,
                walletName: null,
                api: null,
                isLoading: false,
                error: 'Invalid Midnight address format',
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
        });

        logger.log('✅ Midnight wallet state updated successfully');
    };

    // Auto-reconnect on page load (only once per session)
    useEffect(() => {
        // Only auto-reconnect once on initial mount
        if (hasInitializedRef.current) {
            return;
        }

        const autoReconnect = async () => {
            setIsAutoReconnecting(true);
            hasInitializedRef.current = true; // Mark as initialized

            // Auto-reconnect Cardano wallet
            const savedCardanoWallet = localStorage.getItem('connectedCardanoWallet') as SupportedWallet;
            if (savedCardanoWallet && window.cardano?.[savedCardanoWallet]) {
                await connectCardanoWallet(savedCardanoWallet);
            }

            // Auto-reconnect Midnight wallet
            const savedMidnightWallet = localStorage.getItem('connectedMidnightWallet') as SupportedMidnightWallet;
            if (savedMidnightWallet && window.midnight?.[savedMidnightWallet]) {
                await connectMidnightWallet(savedMidnightWallet);
            }

            setIsAutoReconnecting(false);
        };

        autoReconnect();
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
