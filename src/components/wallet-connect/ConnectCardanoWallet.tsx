'use client';

import { SupportedMidnightWallet, SupportedWallet, useWalletContext } from '@/contexts/WalletContext';
import { Button } from '@heroui/react';
import React, { useState } from 'react';
import WalletsModal from './WalletsModal';

const ConnectCardanoWallet: React.FC = () => {
    const { cardano, connectCardanoWallet, disconnectCardanoWallet, getAvailableCardanoWallets } = useWalletContext();

    const { isConnected, address, balanceADA: balance, walletName, isLoading } = cardano;

    const availableWallets = getAvailableCardanoWallets();

    const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

    // Wallet display names and icons
    const walletInfo = {
        nami: { name: 'Nami', icon: '🦎' },
        eternl: { name: 'Eternl', icon: '♾️' },
        lace: { name: 'Lace', icon: '🎭' },
        flint: { name: 'Flint', icon: '🔥' },
        typhoncip30: { name: 'Typhon', icon: '🌪️' },
        nufi: { name: 'NuFi', icon: '💎' },
        gero: { name: 'GeroWallet', icon: '⚡' },
        ccvault: { name: 'CCVault', icon: '🛡️' },
    };

    const handleWalletSelect = async (wallet: SupportedWallet | SupportedMidnightWallet) => {
        await connectCardanoWallet(wallet as SupportedWallet);
    };

    if (isConnected) {
        return (
            <div className="flex flex-col gap-2">
                <div>
                    <h3>✅ Wallet Connected</h3>
                    <p>
                        <strong>Wallet:</strong> {walletInfo[walletName as SupportedWallet]?.name}
                    </p>
                    <p>
                        <strong>Balance:</strong> {balance} ADA
                    </p>
                    <p>
                        <strong>Address:</strong> {address?.slice(0, 20)}...{address?.slice(-10)}
                    </p>
                </div>
                <Button onPress={disconnectCardanoWallet}>Disconnect Wallet</Button>
            </div>
        );
    }

    return (
        <>
            <Button onPress={() => setIsWalletModalOpen(true)} disabled={isLoading}>
                {isLoading ? '⏳ Connecting...' : '🔗 Connect Cardano Wallet'}
            </Button>

            <WalletsModal isOpen={isWalletModalOpen} onOpenChange={setIsWalletModalOpen} wallets={availableWallets} handleWalletSelect={handleWalletSelect} />
        </>
    );
};

export default ConnectCardanoWallet;
