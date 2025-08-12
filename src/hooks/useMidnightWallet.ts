// hooks/useMidnightWallet.ts
import { useState, useEffect } from 'react';

export type SupportedMidnightWallet = 'mnLace';

interface MidnightWalletState {
    isConnected: boolean;
    address: string | null;
    balance: string | null;
    walletName: string | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    api: any | null;
    isLoading: boolean;
    error: string | null;
}

export const useMidnightWallet = () => {
    const [walletState, setWalletState] = useState<MidnightWalletState>({
        isConnected: false,
        address: null,
        balance: null,
        walletName: null,
        api: null,
        isLoading: false,
        error: null,
    });

    console.log('>>> ', window.midnight);

    // Get available wallets
    const getAvailableWallets = (): SupportedMidnightWallet[] => {
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

    // Connect to wallet
    const connectWallet = async (walletName: SupportedMidnightWallet) => {
        try {
            setWalletState(prev => ({ ...prev, isLoading: true, error: null }));

            if (typeof window === 'undefined') {
                throw new Error('Client-side only feature');
            }

            console.log('>>> ', window.midnight);

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
            
            // Midnight doesn't seem to provide balance in the same way as Cardano
            // We'll show the wallet as connected but indicate balance is not available
            const balance = 'N/A (Shield address)';

            setWalletState({
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
            setWalletState(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : 'Failed to connect Midnight wallet'
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
            api: null,
            isLoading: false,
            error: null,
        });
        localStorage.removeItem('connectedMidnightWallet');
    };

    // Auto-reconnect on page load
    useEffect(() => {
        const savedWallet = localStorage.getItem('connectedMidnightWallet') as SupportedMidnightWallet;
        if (savedWallet && window.midnight?.[savedWallet]) {
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