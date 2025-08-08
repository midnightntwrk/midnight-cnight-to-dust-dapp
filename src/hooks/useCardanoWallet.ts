// hooks/useWallet.ts
import { useState, useEffect } from 'react';

type LucidEvolution = any; // We'll import this dynamically

export type SupportedWallet = 'nami' | 'eternl' | 'lace' | 'flint' | 'typhoncip30' | 'nufi' | 'gero' | 'ccvault';

interface WalletState {
    isConnected: boolean;
    address: string | null;
    balance: string | null;
    walletName: string | null;
    lucid: LucidEvolution | null;
    isLoading: boolean;
    error: string | null;
}

export const useCardanoWallet = () => {
    const [walletState, setWalletState] = useState<WalletState>({
        isConnected: false,
        address: null,
        balance: null,
        walletName: null,
        lucid: null,
        isLoading: false,
        error: null,
    });

    // Get available wallets
    const getAvailableWallets = (): SupportedWallet[] => {
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

    // Connect to wallet
    const connectWallet = async (walletName: SupportedWallet) => {
        try {
            setWalletState(prev => ({ ...prev, isLoading: true, error: null }));

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
                    "https://cardano-preview.blockfrost.io/api/v0",
                    "previewPZh12S3oCdqgdUpXIKd7XgOq4fOu0u5e"
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

            // Calculate balance (sum of all UTxOs)
            const balance = utxos.reduce((acc, utxo) => acc + (utxo.assets?.lovelace || BigInt(0)), BigInt(0));
            const balanceInAda = (Number(balance) / 1_000_000).toFixed(6);

            setWalletState({
                isConnected: true,
                address,
                balance: balanceInAda,
                walletName,
                lucid,
                isLoading: false,
                error: null,
            });

            // Store connection in localStorage
            localStorage.setItem('connectedWallet', walletName);

        } catch (error) {
            console.error('Failed to connect wallet:', error);
            setWalletState(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : 'Failed to connect wallet'
            }));
        }
    };

    // Disconnect wallet
    const disconnectWallet = () => {
        setWalletState({
            isConnected: false,
            address: null,
            balance: null,
            walletName: null,
            lucid: null,
            isLoading: false,
            error: null,
        });
        localStorage.removeItem('connectedWallet');
    };

    // Auto-reconnect on page load
    useEffect(() => {
        const savedWallet = localStorage.getItem('connectedWallet') as SupportedWallet;
        if (savedWallet && window.cardano?.[savedWallet]) {
            connectWallet(savedWallet);
        }
    }, []);

    return {
        ...walletState,
        connectWallet,
        disconnectWallet,
        availableWallets: getAvailableWallets(),
    };
};