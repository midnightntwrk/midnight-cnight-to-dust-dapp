'use client'

import React, { useState } from 'react';
import { useWalletContext } from '@/contexts/WalletContext';
import { SupportedWallet } from '@/hooks/useCardanoWallet';
import { SupportedMidnightWallet } from '@/hooks/useMidnightWallet';
import {
    useDisclosure
} from '@heroui/react';
import WalletsModal from './wallet-connect/WalletsModal';
import Stepper from './onboard/Stepper';
import ConnectCardanoCard from './onboard/ConnectCardanoCard';
import ConnectMidnightCard from './onboard/ConnectMidnightCard';
import MatchAddressesCard from './onboard/MatchAddressesCard';
import AddressMatchingModal from './onboard/AddressMatchingModal';

export default function Onboard() {
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

    const [currentStep, setCurrentStep] = useState(1);
    const [isCardanoModalOpen, setIsCardanoModalOpen] = useState(false);
    const [isMidnightModalOpen, setIsMidnightModalOpen] = useState(false);

    const { isOpen: isMatchModalOpen, onOpen: onMatchModalOpen, onOpenChange: onMatchModalChange } = useDisclosure();

    // Wallet display names and icons
    const cardanoWalletInfo = {
        nami: { name: 'Nami', icon: '🦎' },
        eternl: { name: 'Eternl', icon: '♾️' },
        lace: { name: 'Lace', icon: '🎭' },
        flint: { name: 'Flint', icon: '🔥' },
        typhoncip30: { name: 'Typhon', icon: '🌪️' },
        nufi: { name: 'NuFi', icon: '💎' },
        gero: { name: 'GeroWallet', icon: '⚡' },
        ccvault: { name: 'CCVault', icon: '🛡️' },
    };

    const midnightWalletInfo = {
        mnLace: { name: 'Lace (Midnight)', icon: '🌙' },
    };

    // To be implemented
    // const handleRegister = async () => {
    //     // Build, sign and submit transaction
    //     const tx = await cardano.lucid
    //         .newTx()
    //         .payToContract(
    //             contractAddress: '',
    //             { inline: datum },
    //             { lovelace: 2000000n } // amount in lovelace
    //         )
    //         .complete(); // Balance the transaction and initiate UTxO selection
    //     const signedTx = await tx.sign.withWallet().complete();
    //     const txHash = await signedTx.submit();
    // }

    const handleCardanoWalletSelect = async (wallet: SupportedWallet | SupportedMidnightWallet) => {
        await connectCardanoWallet(wallet as SupportedWallet);
        setIsCardanoModalOpen(false);
        if (!cardano.error) {
            setCurrentStep(2);
        }
    };

    const handleMidnightWalletSelect = async (wallet: SupportedWallet | SupportedMidnightWallet) => {
        await connectMidnightWallet(wallet as SupportedMidnightWallet);
        setIsMidnightModalOpen(false);
        if (!midnight.error) {
            setCurrentStep(3);
        }
    };

    const handleMatchAddresses = () => {
        // This is where you'll implement the address matching logic
        onMatchModalOpen();
    };

    // Calculate progress percentage
    const getProgress = () => {
        if (currentStep === 1 && !cardano.isConnected) return 0;
        if (currentStep === 2 && cardano.isConnected && !midnight.isConnected) return 33;
        if (currentStep === 3 && cardano.isConnected && midnight.isConnected) return 100;
        return (currentStep - 1) * 33;
    };

    return (
        <div className="max-w-2xl mx-auto p-6">
            {/* Header */}
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-2">Wallet onboarding</h1>
            </div>

            {/* Stepper Progress */}
            <Stepper 
                currentStep={currentStep}
                cardanoConnected={cardano.isConnected}
                midnightConnected={midnight.isConnected}
            />

            {/* Step 1: Cardano Wallet Connection - Hide when both wallets connected */}
            {!(cardano.isConnected && midnight.isConnected) && (
                <ConnectCardanoCard 
                    isConnected={cardano.isConnected}
                    onConnect={() => setIsCardanoModalOpen(true)}
                    onDisconnect={() => {
                        disconnectCardanoWallet();
                        setCurrentStep(1);
                    }}
                    isLoading={cardano.isLoading}
                    error={cardano.error}
                    walletName={cardano.walletName || ''}
                    balance={cardano.balance || ''}
                    address={cardano.address || ''}
                />
            )}

            {/* Step 2: Midnight Wallet Connection - Hide when both wallets connected */}
            {cardano.isConnected && !(cardano.isConnected && midnight.isConnected) && (
                <ConnectMidnightCard 
                    isConnected={midnight.isConnected}
                    onConnect={() => setIsMidnightModalOpen(true)}
                    onDisconnect={() => {
                        disconnectMidnightWallet();
                        setCurrentStep(2);
                    }}
                    isLoading={midnight.isLoading}
                    error={midnight.error}
                    walletName={midnight.walletName || ''}
                    balance={midnight.balance || ''}
                    address={midnight.address || ''}
                />
            )}

            {/* Step 3: Address Matching - Only show when both wallets connected */}
            {cardano.isConnected && midnight.isConnected && (
                <MatchAddressesCard 
                    cardanoWalletName={cardano.walletName || ''}
                    cardanoBalance={cardano.balance || ''}
                    cardanoAddress={cardano.address || ''}
                    onDisconnectCardano={() => {
                        disconnectCardanoWallet();
                        setCurrentStep(1);
                    }}
                    midnightWalletName={midnight.walletName || ''}
                    midnightAddress={midnight.address || ''}
                    onDisconnectMidnight={() => {
                        disconnectMidnightWallet();
                        setCurrentStep(2);
                    }}
                    onMatch={handleMatchAddresses}
                />
            )}

            {/* Cardano Wallet Selection Modal */}
            <WalletsModal
                isOpen={isCardanoModalOpen}
                onOpenChange={setIsCardanoModalOpen}
                wallets={getAvailableCardanoWallets()}
                handleWalletSelect={handleCardanoWalletSelect}
            />

            {/* Midnight Wallet Selection Modal */}
            <WalletsModal
                isOpen={isMidnightModalOpen}
                onOpenChange={setIsMidnightModalOpen}
                wallets={getAvailableMidnightWallets()}
                handleWalletSelect={handleMidnightWalletSelect}
            />

            {/* Address Matching Confirmation Modal */}
            <AddressMatchingModal 
                isOpen={isMatchModalOpen}
                onOpenChange={onMatchModalChange}
            />
        </div>
    );
}