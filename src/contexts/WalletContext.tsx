'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
    CNIGHT_CURRENCY_ENCODEDNAME,
    CNIGHT_CURRENCY_POLICY_ID,
    getCurrentNetwork,
    initializeLucidWithBlockfrostClientSide,
    isMainnet,
    isTestnet,
    LUCID_NETWORK_MAINNET_ID,
    LUCID_NETWORK_TESTNET_ID,
} from '@/config/network';
import { useGenerationStatus } from '@/hooks/useGenerationStatus';
import { useRegistrationUtxo } from '@/hooks/useRegistrationUtxo';
import { getTotalOfUnitInUTxOList } from '@/lib/utils';
import { UTxO } from '@lucid-evolution/lucid';

import { LucidEvolution, getAddressDetails, mintingPolicyToId, toHex, TxSignBuilder } from '@lucid-evolution/lucid';


export type SupportedWallet = 'nami' | 'eternl' | 'lace' | 'flint' | 'typhoncip30' | 'nufi' | 'gero' | 'ccvault';
export type SupportedMidnightWallet = 'mnLace';

// Generation Status Types
export interface GenerationStatusData {
    cardanoStakeKey: string;
    dustAddress: string | null;
    isRegistered: boolean;
    generationRate: string;
}

// Types
interface CardanoWalletState {
    isConnected: boolean;
    address: string | null;
    stakeKey: string | null;
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
    // Cardano wallet methods
    connectCardanoWallet: (walletName: SupportedWallet) => Promise<void>;
    disconnectCardanoWallet: () => void;
    getAvailableCardanoWallets: () => SupportedWallet[];
    // Midnight wallet methods
    connectMidnightWallet: (walletName: SupportedMidnightWallet) => Promise<void>;
    disconnectMidnightWallet: () => void;
    getAvailableMidnightWallets: () => SupportedMidnightWallet[];
    setManualMidnightAddress: (address: string) => void;
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
}

// Create context
const WalletContext = createContext<WalletContextType | undefined>(undefined);

// Provider component
export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Cardano wallet state
    const [cardanoState, setCardanoState] = useState<CardanoWalletState>({
        isConnected: false,
        address: null,
        stakeKey: null,
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

    // Generation status hook
    const { data: generationStatus, isLoading: isCheckingRegistration, error: registrationError, refetch: refetchGenerationStatus } = useGenerationStatus(cardanoState.address);

    // Registration UTXO hook
    const {
        registrationUtxo,
        isLoadingRegistrationUtxo,
        registrationUtxoError,
        refetch: findRegistrationUtxo,
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
            console.log('[Wallet]', `Wallet API - NetworkId: ${networkId}`);
            if (isMainnet && networkId !== LUCID_NETWORK_MAINNET_ID) {
                throw new Error(`Must connect with a ${getCurrentNetwork()} Cardano Wallet`);
            }
            if (isTestnet && networkId !== LUCID_NETWORK_TESTNET_ID) {
                throw new Error(`Must connect with a ${getCurrentNetwork()} Testnet Cardano Wallet`);
            }

            // Select the wallet in Lucid directly with the API
            lucid.selectWallet.fromAPI(api);

            // Get wallet info
            const address = await lucid.wallet().address();
            const cardanoAddressDetails = getAddressDetails(address);

            console.log('Cardano Address Details:', cardanoAddressDetails);

            const cardanoStakeKey = cardanoAddressDetails?.stakeCredential?.hash;

            console.log('Cardano Stake Key:', cardanoStakeKey);

            const utxos = await lucid.wallet().getUtxos();

            console.log('[Wallet]', 'UTXOs ', utxos);

            const tokenNightPolicy = CNIGHT_CURRENCY_POLICY_ID;
            const tokenNightEncodedName = CNIGHT_CURRENCY_ENCODEDNAME;

            const balanceNight = getTotalOfUnitInUTxOList(tokenNightPolicy + tokenNightEncodedName, utxos);
            const balanceNightStr = (Number(balanceNight) / 1_000_000).toFixed(6);
            console.log('[Wallet]', 'Balance cNight ', balanceNightStr);

            // Calculate balance (sum of all UTxOs)
            const balanceLovelace = utxos.reduce((acc, utxo) => acc + (utxo.assets?.lovelace || BigInt(0)), BigInt(0));
            const balanceInAdaStr = (Number(balanceLovelace) / 1_000_000).toFixed(6);
            console.log('[Wallet]', 'Balance ADA ', balanceInAdaStr);


            setCardanoState({
                isConnected: true,
                address,
                stakeKey: cardanoStakeKey || null,
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
            console.error('[Wallet]', 'Failed to connect Cardano wallet:', error);
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

            // Connect to Midnight wallet
            const api = await window.midnight[walletName].enable();

            // Get wallet state from Midnight API
            const walletState = await api.state();
            console.log('[Wallet]', 'Midnight Wallet State:', walletState);

            // Extract values from wallet state
            const address = walletState?.address || null;
            const coinPublicKey = walletState?.coinPublicKeyLegacy || null;
            const balance = 'N/A (Shield address)';

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
            console.error('[Wallet]', 'Failed to connect Midnight wallet:', error);
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
        setMidnightState({
            isConnected: true,
            address: address,
            coinPublicKey: address, // For DUST protocol, use the address as coinPublicKey
            balance: 'Manual Address',
            walletName: 'Manual',
            api: null,
            isLoading: false,
            error: null,
        });
    };

    // Auto-reconnect on page load
    useEffect(() => {
        // Auto-reconnect Cardano wallet
        const savedCardanoWallet = localStorage.getItem('connectedCardanoWallet') as SupportedWallet;
        if (savedCardanoWallet && window.cardano?.[savedCardanoWallet]) {
            connectCardanoWallet(savedCardanoWallet);
        }

        // Auto-reconnect Midnight wallet
        const savedMidnightWallet = localStorage.getItem('connectedMidnightWallet') as SupportedMidnightWallet;
        if (savedMidnightWallet && window.midnight?.[savedMidnightWallet]) {
            connectMidnightWallet(savedMidnightWallet);
        }
    }, []);

    const contextValue: WalletContextType = {
        cardano: cardanoState,
        midnight: midnightState,
        connectCardanoWallet,
        disconnectCardanoWallet,
        getAvailableCardanoWallets,
        connectMidnightWallet,
        disconnectMidnightWallet,
        getAvailableMidnightWallets,
        setManualMidnightAddress,
        generationStatus,
        isCheckingRegistration,
        registrationError,
        refetchGenerationStatus,
        registrationUtxo,
        isLoadingRegistrationUtxo,
        registrationUtxoError,
        findRegistrationUtxo,
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
