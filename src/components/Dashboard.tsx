'use client';

import { SupportedMidnightWallet, SupportedWallet, useWalletContext } from '@/contexts/WalletContext';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CardanoWalletCard from './dashboard/CardanoWalletCard';
import GenerationRateCard from './dashboard/GenerationRateCard';
import MidnightWalletCard from './dashboard/MidnightWalletCard';
import RegistrationUtxoCard from './dashboard/RegistrationUtxoCard';
import WalletsModal from './wallet-connect/WalletsModal';
import LoadingBackdrop from './ui/LoadingBackdrop';

export default function Dashboard() {
    const router = useRouter();
    const {
        cardano,
        isAutoReconnecting,
        connectCardanoWallet,
        connectMidnightWallet,
        getAvailableCardanoWallets,
        getAvailableMidnightWallets,
        midnight,
        registrationUtxo,
        isLoadingRegistrationUtxo,
    } = useWalletContext();

    const [isCardanoModalOpen, setIsCardanoModalOpen] = useState(false);
    const [isMidnightModalOpen, setIsMidnightModalOpen] = useState(false);

    // Redirect to home if Cardano wallet is not connected (after auto-reconnect is complete)
    useEffect(() => {
        if (!isAutoReconnecting && !cardano.isConnected) {
            console.log('🏠 No Cardano wallet connected after auto-reconnect, redirecting to home...');
            router.push('/');
        }
    }, [cardano.isConnected, isAutoReconnecting, router]);

    // Debug logging - redirect logic is now centralized in WalletContext
    useEffect(() => {
        console.log('🔍 Dashboard - Cardano State:', cardano);
        console.log('🔍 Dashboard - Midnight State:', midnight);
        console.log('🔍 Dashboard - Registration UTXO:', registrationUtxo);
        console.log('🔍 Dashboard - Loading UTXO:', isLoadingRegistrationUtxo);
    }, [cardano, midnight, registrationUtxo, isLoadingRegistrationUtxo]);

    // Show loading backdrop while auto-reconnecting
    if (isAutoReconnecting) {
        return (
            <div className="max-w-6xl mx-auto p-6">
                <LoadingBackdrop
                    isVisible={true}
                    title="Connecting to saved wallets..."
                    subtitle="Please wait while we restore your wallet connections"
                />
            </div>
        );
    }

    if (isLoadingRegistrationUtxo) {
        return (
            <div className="max-w-6xl mx-auto p-6">
                <LoadingBackdrop
                    isVisible={true}
                    title="Loading registration UTXO..."
                    subtitle="Please wait while we load your registration UTXO"
                />
            </div>
        );
    }

    // Don't render dashboard if Cardano wallet is not connected (after auto-reconnect is complete)
    if (!cardano.isConnected) {
        return null; // This should trigger redirect via useEffect
    }

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
            <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
                <CardanoWalletCard />
                <GenerationRateCard />
                <MidnightWalletCard />
            </div>

            {/* Registration UTXO Card */}
            <div className="mt-6">
                <RegistrationUtxoCard />
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
