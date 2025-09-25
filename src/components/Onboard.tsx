'use client';

// TODO: delete if dont need transaction progress component
// import { TransactionLabels } from '@/components/ui/TransactionProgress';
import { useDustProtocol } from '@/contexts/DustProtocolContext';
import { useTransaction } from '@/contexts/TransactionContext';
import { SupportedMidnightWallet, SupportedWallet, useWalletContext } from '@/contexts/WalletContext';
import { DustTransactionsUtils } from '@/lib/dustTransactionsUtils';
import { useDisclosure } from '@heroui/react';
import type { LucidEvolution } from '@lucid-evolution/lucid';
import { useState } from 'react';
import AddressMatchingModal from './onboard/AddressMatchingModal';
import ConnectCardanoCard from './onboard/ConnectCardanoCard';
import ConnectMidnightCard from './onboard/ConnectMidnightCard';
import MatchAddressesCard from './onboard/MatchAddressesCard';
import WalletsModal from './wallet-connect/WalletsModal';
import TransactionProgress from './ui/TransactionProgress';

export default function Onboard() {
    const {
        cardano,
        midnight,
        connectCardanoWallet,
        connectMidnightWallet,
        disconnectCardanoWallet,
        disconnectMidnightWallet,
        getAvailableCardanoWallets,
        getAvailableMidnightWallets,
        setManualMidnightAddress,
        refetchGenerationStatus,
        findRegistrationUtxo,
    } = useWalletContext();

    // TODO: delete if dont need transaction progress component
    // const [currentStep, setCurrentStep] = useState(1);
    const [isCardanoModalOpen, setIsCardanoModalOpen] = useState(false);
    const [isMidnightModalOpen, setIsMidnightModalOpen] = useState(false);

    // Use DUST protocol context
    const { contracts, protocolStatus } = useDustProtocol();

    // Transaction management
    const transaction = useTransaction();

    const { isOpen: isMatchModalOpen, onOpen: onMatchModalOpen, onOpenChange: onMatchModalChange } = useDisclosure();

    // TODO: delete if dont need transaction progress component
    // Labels for registration transaction - only override specific ones
    // const registrationLabels: TransactionLabels = {
    //     title: 'DUST Registration Transaction',
    //     success: 'Registration completed successfully!',
    //     error: 'Registration transaction failed',
    //     signHelper: '💡 Please check your wallet and approve the registration transaction to continue.',
    //     successDescription: 'Your Cardano and Midnight addresses have been successfully registered in the DUST protocol.',
    // };

    const handleCardanoWalletSelect = async (wallet: SupportedWallet | SupportedMidnightWallet) => {
        await connectCardanoWallet(wallet as SupportedWallet);
        setIsCardanoModalOpen(false);
        if (!cardano.error) {
            // setCurrentStep(2);
        }
    };

    const handleMidnightWalletSelect = async (wallet: SupportedWallet | SupportedMidnightWallet) => {
        await connectMidnightWallet(wallet as SupportedMidnightWallet);
        setIsMidnightModalOpen(false);
        if (!midnight.error) {
            // setCurrentStep(3);
        }
    };

    const handleManualMidnightAddress = (address: string) => {
        setManualMidnightAddress(address);
        // setCurrentStep(3);
    };

    const handleMatchAddresses = async () => {
        if (!cardano.lucid) {
            console.error('❌ Cardano wallet not connected');
            return;
        }

        // Check if dust protocol is ready first
        if (!protocolStatus?.isReady) {
            console.error('❌ Dust protocol not ready for registration');
            transaction.setError('Dust protocol is not ready. Please ensure InitVersioningCommand & InitDustProductionCommand are completed.');
            return;
        }

        // Get DUST PKH from midnight wallet
        const dustPKHValue = midnight.coinPublicKey;
        if (!dustPKHValue) {
            console.error('❌ Midnight wallet coinPublicKey not available');
            transaction.setError('Midnight wallet coinPublicKey not available. Please reconnect your Midnight wallet.');
            return;
        }

        try {
            console.log('🚀 Starting DUST registration...');

            // Create the registration executor and execute it
            const registrationExecutor = DustTransactionsUtils.createRegistrationExecutor(cardano.lucid as LucidEvolution, contracts, dustPKHValue);

            const transactionState = await transaction.executeTransaction('register', registrationExecutor, {}, cardano.lucid as LucidEvolution);

            // Only open success modal if transaction actually succeeded
            if (transactionState === 'success') {
                refetchGenerationStatus();
                findRegistrationUtxo();
                onMatchModalOpen();
            } else {
                console.error('transactionState:', transactionState);
                throw new Error('transactionState:' + transactionState);
            }
        } catch (error) {
            console.error('❌ DUST registration failed:', error);
            // Error is already handled by TransactionContext, no need to set it again
        }
    };

    // TODO: delete if dont need transaction progress component
    // // Calculate progress percentage
    // const getProgress = () => {
    //     if (currentStep === 1 && !cardano.isConnected) return 0;
    //     if (currentStep === 2 && cardano.isConnected && !midnight.isConnected) return 33;
    //     if (currentStep === 3 && cardano.isConnected && midnight.isConnected) return 100;
    //     return (currentStep - 1) * 33;
    // };

    return (
        <div className="w-full max-w-4xl lg:max-w-6xl mx-auto p-6">
            {/* Stepper Progress */}
            {/* <Stepper currentStep={currentStep} cardanoConnected={cardano.isConnected} midnightConnected={midnight.isConnected} /> */}

            {/* Step 2: Midnight Wallet Connection - Hide when both wallets connected */}
            {cardano.isConnected && !(cardano.isConnected && midnight.isConnected) && (
                <ConnectMidnightCard
                    isConnected={midnight.isConnected}
                    onConnect={() => setIsMidnightModalOpen(true)}
                    onDisconnect={() => {
                        disconnectMidnightWallet();
                        // setCurrentStep(2);
                    }}
                    isLoading={midnight.isLoading}
                    error={midnight.error}
                    walletName={midnight.walletName || ''}
                    balance={midnight.balance || ''}
                    address={midnight.address || ''}
                    onManualAddressSubmit={handleManualMidnightAddress}
                />
            )}

            {/* Step 1: Cardano Wallet Connection - Hide when both wallets connected */}
            {!(cardano.isConnected && midnight.isConnected) && (
                <ConnectCardanoCard
                    isConnected={cardano.isConnected}
                    onConnect={() => setIsCardanoModalOpen(true)}
                    onDisconnect={() => {
                        disconnectCardanoWallet();
                        // setCurrentStep(1);
                    }}
                    isLoading={cardano.isLoading}
                    error={cardano.error}
                    walletName={cardano.walletName || ''}
                    balance={cardano.balanceADA || ''}
                    address={cardano.address || ''}
                />
            )}

            {/* Step 3: Address Matching - Only show when both wallets connected */}
            {cardano.isConnected && midnight.isConnected && (
                <div className="space-y-4">
                    {/* Dust Protocol Status */}
                    {/* <DustProtocolStatus /> */}

                    {/* Transaction Progress */}
                    <TransactionProgress />

                    {/* DUST PKH Info - show the coinPublicKey from midnight wallet 
                    NOTE | TODO: This is for testing purposes only. Dont show this in production */}
                    {/* {protocolStatus?.isReady && transaction.transactionState === 'idle' && midnight.coinPublicKey && (
                        <div className="bg-white/5 rounded-lg p-4 mb-4">
                            <h4 className="text-white font-semibold mb-2">Midnight DUST Public Key</h4>
                            <div className="p-3 bg-white/10 rounded-lg border border-white/20">
                                <p className="text-white/80 text-sm font-mono break-all">{midnight.coinPublicKey}</p>
                            </div>
                            <p className="text-xs text-white/60 mt-1">💡 This key will be used for DUST protocol registration</p>
                        </div>
                    )} */}

                    <MatchAddressesCard
                        cardanoWalletName={cardano.walletName || ''}
                        cardanoBalance={cardano.balanceADA || ''}
                        cardanoAddress={cardano.address || ''}
                        onDisconnectCardano={() => {
                            disconnectCardanoWallet();
                            // setCurrentStep(1);
                            transaction.resetTransaction();
                        }}
                        midnightWalletName={midnight.walletName || ''}
                        midnightAddress={midnight.address || ''}
                        onDisconnectMidnight={() => {
                            disconnectMidnightWallet();
                            // setCurrentStep(2);
                            transaction.resetTransaction();
                        }}
                        onMatch={handleMatchAddresses}
                    />
                </div>
            )}

            {/* Cardano Wallet Selection Modal */}
            <WalletsModal isOpen={isCardanoModalOpen} onOpenChange={setIsCardanoModalOpen} wallets={getAvailableCardanoWallets()} handleWalletSelect={handleCardanoWalletSelect} />

            {/* Midnight Wallet Selection Modal */}
            <WalletsModal
                isOpen={isMidnightModalOpen}
                onOpenChange={setIsMidnightModalOpen}
                wallets={getAvailableMidnightWallets()}
                handleWalletSelect={handleMidnightWalletSelect}
            />

            {/* Address Matching Confirmation Modal */}
            <AddressMatchingModal isOpen={isMatchModalOpen} onOpenChange={onMatchModalChange} />
        </div>
    );
}
