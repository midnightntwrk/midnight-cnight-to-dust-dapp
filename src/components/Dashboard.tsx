'use client'

import React, { useState } from 'react';
import { useWalletContext } from '@/contexts/WalletContext';
import { SupportedWallet } from '@/hooks/useCardanoWallet';
import { SupportedMidnightWallet } from '@/hooks/useMidnightWallet';
import { Button } from '@heroui/react';
import WalletsModal from './wallet-connect/WalletsModal';
import CardanoWalletCard from './dashboard/CardanoWalletCard';
import MidnightWalletCard from './dashboard/MidnightWalletCard';
import GenerationRateCard from './dashboard/GenerationRateCard';


export default function Dashboard() {
    const {
        cardano,
        midnight,
        connectCardanoWallet,
        connectMidnightWallet,
        disconnectCardanoWallet,
        disconnectMidnightWallet,
        getAvailableCardanoWallets,
        getAvailableMidnightWallets
    } = useWalletContext();

    const [isCardanoModalOpen, setIsCardanoModalOpen] = useState(false);
    const [isMidnightModalOpen, setIsMidnightModalOpen] = useState(false);

    // Wallet display names and icons

    const handleCardanoWalletSelect = async (wallet: SupportedWallet | SupportedMidnightWallet) => {
        await connectCardanoWallet(wallet as SupportedWallet);
        setIsCardanoModalOpen(false);
    };

    const handleMidnightWalletSelect = async (wallet: SupportedWallet | SupportedMidnightWallet) => {
        await connectMidnightWallet(wallet as SupportedMidnightWallet);
        setIsMidnightModalOpen(false);
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Generating DUST</h1>
                    <p className="text-gray-500">Manage your Cardano and Midnight wallet connections</p>
                </div>
            </div>
            <div className='flex flex-col lg:flex-row gap-4 lg:gap-6'>
                <CardanoWalletCard />
                <GenerationRateCard />
                <MidnightWalletCard />
            </div>

            <div className='flex flex-col gap-4 mt-12 mb-12'>
                Available RAW Info:
                <div>
                    <p className='text-lg font-bold'>Cardano Wallet</p>
                    <p>Address: {cardano.address}</p>
                    <p>Balance: {cardano.balance}</p>
                    <p>Wallet Name: {cardano.walletName}</p>
                </div>
                <div>
                    <p className='text-lg font-bold'>Midnight Wallet</p>
                    <p>Address: {midnight.address}</p>
                    <p>Balance: {midnight.balance}</p>
                    <p>Wallet Name: {midnight.walletName}</p>
                </div>
            </div>

            {/* <div>
                <ConnectionStatus />
            </div> */}

            <div className='flex flex-col gap-4'>
                <Button color='danger' onPress={() => disconnectCardanoWallet()}>
                    Disconnect Cardano Wallet
                </Button>
                <Button color='danger' onPress={() => disconnectMidnightWallet()}>
                    Disconnect Midnight Wallet
                </Button>
            </div>

            {/* Wallet Selection Modals */}
            <WalletsModal
                isOpen={isCardanoModalOpen}
                onOpenChange={setIsCardanoModalOpen}
                wallets={getAvailableCardanoWallets()}
                handleWalletSelect={handleCardanoWalletSelect}
            />

            <WalletsModal
                isOpen={isMidnightModalOpen}
                onOpenChange={setIsMidnightModalOpen}
                wallets={getAvailableMidnightWallets()}
                handleWalletSelect={handleMidnightWalletSelect}
            />
        </div>
    );
}