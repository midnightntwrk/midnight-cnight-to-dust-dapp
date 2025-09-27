'use client';

import { useState, useEffect } from 'react';
import { WalletApi } from '@lucid-evolution/lucid';

interface WalletConnectionProps {
    onConnect: (walletApi: WalletApi) => void;
    loading: boolean;
}

interface WalletInfo {
    name: string;
    icon: string;
    isEnabled: boolean;
    api?: unknown;
}

export default function WalletConnection({ onConnect, loading }: WalletConnectionProps) {
    const [wallets, setWallets] = useState<WalletInfo[]>([]);
    const [error, setError] = useState<string>('');
    const [isCheckingWallets, setIsCheckingWallets] = useState(true);

    // Real wallet availability checker - no timeouts, just real API checks
    const checkWalletAvailability = async (walletName: string, walletApi: { enable?: () => Promise<unknown>; isEnabled?: () => Promise<boolean> }): Promise<boolean> => {
        try {
            // Check if wallet has required methods
            if (!walletApi.enable || typeof walletApi.enable !== 'function') return false;
            if (!walletApi.isEnabled || typeof walletApi.isEnabled !== 'function') return false;
            
            // Test if wallet API actually responds (not just exists)
            const isEnabled = await Promise.race([
                walletApi.isEnabled(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
            ]);
            
            return typeof isEnabled === 'boolean';
        } catch (error) {
            console.log(`Wallet ${walletName} not ready:`, error);
            return false;
        }
    };

    useEffect(() => {
        let isMounted = true;
        
        const detectAndMonitorWallets = async () => {
            if (typeof window === 'undefined') return;

            const cardano = (window as { cardano?: Record<string, unknown> }).cardano;
            if (!cardano) {
                setError('No Cardano wallets detected. Please install a Cardano wallet extension.');
                setIsCheckingWallets(false);
                return;
            }

            const walletNames = ['nami', 'eternl', 'flint', 'yoroi', 'gero', 'typhon'];
            
            // Continuously check wallet availability until we find working wallets or component unmounts
            while (isMounted) {
                const detectedWallets: WalletInfo[] = [];

                for (const walletName of walletNames) {
                    if (cardano[walletName]) {
                        const wallet = cardano[walletName] as {
                            icon?: string;
                            isEnabled?: () => Promise<boolean>;
                            enable?: () => Promise<unknown>;
                        };

                        // Real availability check - no guessing
                        const isReallyAvailable = await checkWalletAvailability(walletName, wallet);
                        
                        detectedWallets.push({
                            name: walletName.charAt(0).toUpperCase() + walletName.slice(1),
                            icon: wallet.icon || '/wallet-icon.png',
                            isEnabled: isReallyAvailable,
                            api: wallet,
                        });
                    }
                }

                if (isMounted) {
                    setWallets(detectedWallets);
                    
                    // If we found at least one working wallet, stop checking
                    const hasWorkingWallet = detectedWallets.some(w => w.isEnabled);
                    if (hasWorkingWallet) {
                        setIsCheckingWallets(false);
                        setError('');
                        break;
                    }
                    
                    // If no wallets detected at all, show error and stop
                    if (detectedWallets.length === 0) {
                        setError('No supported wallets found. Please install Nami, Eternl, Flint, or another supported wallet.');
                        setIsCheckingWallets(false);
                        break;
                    }
                }

                // Wait before next check (reasonable interval, not random)
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
        };

        detectAndMonitorWallets();
        
        return () => {
            isMounted = false;
        };
    }, []);

    const connectWallet = async (wallet: WalletInfo) => {
        try {
            setError('');
            if (!wallet.api) return;

            const walletApi = await (wallet.api as { enable: () => Promise<WalletApi> }).enable();
            onConnect(walletApi);
        } catch (err) {
            console.error('Failed to connect wallet:', err);
            setError(`Failed to connect to ${wallet.name}. Please try again.`);
        }
    };

    return (
        <div className="text-center space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
                <p className="text-blue-200">Connect your Cardano wallet to start the DUST system setup</p>
            </div>

            {error && <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 text-red-200">{error}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-2xl mx-auto">
                {wallets.map((wallet) => (
                    <button
                        key={wallet.name}
                        onClick={() => connectWallet(wallet)}
                        disabled={loading || !wallet.isEnabled || isCheckingWallets}
                        className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg p-6 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <div className="flex flex-col items-center space-y-3">
                            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                                <span className="text-2xl">🏦</span>
                            </div>
                            <div>
                                <h3 className="text-white font-semibold">{wallet.name}</h3>
                                <p className="text-blue-200 text-sm">
                                    {isCheckingWallets ? 'Checking...' : wallet.isEnabled ? 'Ready to connect' : 'Not ready'}
                                </p>
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            {loading && (
                <div className="flex items-center justify-center space-x-2 text-blue-200">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-400 border-t-transparent"></div>
                    <span>Connecting wallet...</span>
                </div>
            )}

            {(wallets.length === 0 && !error) || isCheckingWallets ? (
                <div className="text-blue-200">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-400 border-t-transparent mx-auto mb-2"></div>
                    {wallets.length === 0 ? 'Detecting wallets...' : 'Checking wallet readiness...'}
                </div>
            ) : null}
        </div>
    );
}
