'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SupportedWallet } from '@/hooks/useCardanoWallet';
import { SupportedMidnightWallet } from '@/hooks/useMidnightWallet';

// Types
interface CardanoWalletState {
    isConnected: boolean;
    address: string | null;
    balance: string | null;
    walletName: string | null;
    lucid: any | null;
    isLoading: boolean;
    error: string | null;
}

interface MidnightWalletState {
    isConnected: boolean;
    address: string | null;
    balance: string | null;
    walletName: string | null;
    api: any | null;
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
}

// Create context
const WalletContext = createContext<WalletContextType | undefined>(undefined);

// Provider component
export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Cardano wallet state
    const [cardanoState, setCardanoState] = useState<CardanoWalletState>({
        isConnected: false,
        address: null,
        balance: null,
        walletName: null,
        lucid: null,
        isLoading: false,
        error: null,
    });

    // Midnight wallet state
    const [midnightState, setMidnightState] = useState<MidnightWalletState>({
        isConnected: false,
        address: null,
        balance: null,
        walletName: null,
        api: null,
        isLoading: false,
        error: null,
    });

    // Cardano wallet methods
    const getAvailableCardanoWallets = (): SupportedWallet[] => {
        if (typeof window === 'undefined') return [];

        const wallets: SupportedWallet[] = [];
        const supportedWallets: SupportedWallet[] = ['nami', 'eternl', 'lace', 'flint', 'typhoncip30', 'nufi', 'gero', 'ccvault'];

        supportedWallets.forEach(wallet => {
            if (window.cardano?.[wallet]) {
                wallets.push(wallet);
            }
        });

        return wallets;
    };

    const connectCardanoWallet = async (walletName: SupportedWallet) => {
        try {
            setCardanoState(prev => ({ ...prev, isLoading: true, error: null }));

            if (typeof window === 'undefined') {
                throw new Error('Client-side only feature');
            }

            if (!window.cardano?.[walletName]) {
                throw new Error(`${walletName} wallet not found. Please install it first.`);
            }

            // Dynamic import to avoid SSR issues
            const { Lucid, Blockfrost } = await import('@lucid-evolution/lucid');

            // Initialize Lucid with Blockfrost for Preview network
            const lucid = await Lucid(
                new Blockfrost(
                    process.env.NEXT_PUBLIC_BLOCKFROST_URL || "https://cardano-preview.blockfrost.io/api/v0",
                    process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY || "previewPZh12S3oCdqgdUpXIKd7XgOq4fOu0u5e"
                ),
                "Preview"
            );

            // Connect to wallet
            const api = await window.cardano[walletName].enable();

            // Select the wallet in Lucid directly with the API
            lucid.selectWallet.fromAPI(api);

            // Get wallet info
            const address = await lucid.wallet().address();
            const utxos = await lucid.wallet().getUtxos();

            console.log('UTXOs ', utxos)

            const tokenPolicy = '';

            // utxos.assets i have the different balances[]
            // first 56 characters is policy id
            // rest is toikenName in hex > fromHex(....) = tokenName
            // value is balance with 6 decimals
            // integrate with lucid built in function

            // Calculate balance (sum of all UTxOs)
            const balance = utxos.reduce((acc, utxo) => acc + (utxo.assets?.lovelace || BigInt(0)), BigInt(0));
            const balanceInAda = (Number(balance) / 1_000_000).toFixed(6);

            setCardanoState({
                isConnected: true,
                address,
                balance: balanceInAda,
                walletName,
                lucid, // from this variable we will execute all tx
                isLoading: false,
                error: null,
            });

            // Store connection in localStorage
            localStorage.setItem('connectedCardanoWallet', walletName);

        } catch (error) {
            console.error('Failed to connect Cardano wallet:', error);
            setCardanoState(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : 'Failed to connect wallet'
            }));
        }
    };

    const disconnectCardanoWallet = () => {
        setCardanoState({
            isConnected: false,
            address: null,
            balance: null,
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

        supportedWallets.forEach(wallet => {
            if (window.midnight?.[wallet]) {
                wallets.push(wallet);
            }
        });

        return wallets;
    };

    const connectMidnightWallet = async (walletName: SupportedMidnightWallet) => {
        try {
            setMidnightState(prev => ({ ...prev, isLoading: true, error: null }));

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
            console.log('Midnight Wallet State:', walletState);

            // Extract address from the state
            const address = walletState?.address || null;

            const balance = 'N/A (Shield address)';

            setMidnightState({
                isConnected: true,
                address,
                balance,
                walletName,
                api,
                isLoading: false,
                error: null,
            });

            // Store connection in localStorage
            localStorage.setItem('connectedMidnightWallet', walletName);

        } catch (error) {
            console.error('Failed to connect Midnight wallet:', error);
            setMidnightState(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : 'Failed to connect Midnight wallet'
            }));
        }
    };

    const disconnectMidnightWallet = () => {
        setMidnightState({
            isConnected: false,
            address: null,
            balance: null,
            walletName: null,
            api: null,
            isLoading: false,
            error: null,
        });
        localStorage.removeItem('connectedMidnightWallet');
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
    };

    return (
        <WalletContext.Provider value={contextValue}>
            {children}
        </WalletContext.Provider>
    );
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