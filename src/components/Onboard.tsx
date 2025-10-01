'use client';
import { logger } from '@/lib/logger';

// TODO: delete if dont need transaction progress component
// import { TransactionLabels } from '@/components/ui/TransactionProgress';
import { useDustProtocol } from '@/contexts/DustProtocolContext';
import { useTransaction } from '@/contexts/TransactionContext';
import { SupportedMidnightWallet, SupportedWallet, useWalletContext } from '@/contexts/WalletContext';
import { DustTransactionsUtils } from '@/lib/dustTransactionsUtils';
import { useDisclosure } from '@heroui/react';
import type { LucidEvolution } from '@lucid-evolution/lucid';
import { useState, useEffect } from 'react';
import AddressMatchingModal from './onboard/AddressMatchingModal';
import ConnectCardanoCard from './onboard/ConnectCardanoCard';
import ConnectMidnightCard from './onboard/ConnectMidnightCard';
import MatchAddressesCard from './onboard/MatchAddressesCard';
import WalletsModal from './wallet-connect/WalletsModal';

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
        pollRegistrationUtxo,
    } = useWalletContext();

    const [isCardanoModalOpen, setIsCardanoModalOpen] = useState(false);
    const [isMidnightModalOpen, setIsMidnightModalOpen] = useState(false);

    // Use DUST protocol context
    const { contracts, protocolStatus } = useDustProtocol();

    // Transaction management
    const transaction = useTransaction();

    const { isOpen: isTransactionModalOpen, onOpen: onTransactionModalOpen, onOpenChange: onTransactionModalChange } = useDisclosure();

    // Labels for registration transaction - only override specific ones
    const registrationLabels = {
        title: 'DUST Registration Transaction',
        success: 'Registration completed successfully!',
        error: 'Registration transaction failed',
        signHelper: '💡 Please check your wallet and approve the registration transaction to continue.',
        successDescription: 'Your Cardano and Midnight addresses have been successfully registered in the DUST protocol.',
    };

    // Auto-open modal when transaction starts (not idle)
    // useEffect(() => {
    //     if (transaction.transactionState !== 'idle' && !isTransactionModalOpen) {
    //         onTransactionModalOpen();
    //     }
    // }, [transaction.transactionState, isTransactionModalOpen, onTransactionModalOpen]);

    const handleCardanoWalletSelect = async (wallet: SupportedWallet | SupportedMidnightWallet) => {
        await connectCardanoWallet(wallet as SupportedWallet);
        setIsCardanoModalOpen(false);
    };

    const handleMidnightWalletSelect = async (wallet: SupportedWallet | SupportedMidnightWallet) => {
        await connectMidnightWallet(wallet as SupportedMidnightWallet);
        setIsMidnightModalOpen(false);
    };

    const handleManualMidnightAddress = (address: string) => {
        setManualMidnightAddress(address);
    };

    const handleMatchAddresses = async () => {
        if (!cardano.lucid) {
            logger.error('❌ Cardano wallet not connected');
            return;
        }

        // Check if dust protocol is ready first
        if (!protocolStatus?.isReady) {
            logger.error('❌ Dust protocol not ready for registration');
            transaction.setError('Dust protocol is not ready. Please ensure InitVersioningCommand & InitDustProductionCommand are completed.');
            return;
        }

        // Get DUST PKH from midnight wallet
        const dustPKHValue = midnight.coinPublicKey;
        if (!dustPKHValue) {
            logger.error('❌ Midnight wallet coinPublicKey not available');
            transaction.setError('Midnight wallet coinPublicKey not available. Please reconnect your Midnight wallet.');
            return;
        }

        try {
            logger.log('🚀 Starting DUST registration...');

            // Create the registration executor and execute it
            const registrationExecutor = DustTransactionsUtils.createRegistrationExecutor(
                cardano.lucid as LucidEvolution,
                contracts,
                dustPKHValue
            );

            const transactionState = await transaction.executeTransaction(
                'register',
                registrationExecutor,
                {},
                cardano.lucid as LucidEvolution
            );

            // Only open success modal if transaction actually succeeded
            if (transactionState === 'success') {
                transaction.resetTransaction();
                refetchGenerationStatus();
                // Poll until registration UTXO is found (Blockfrost might take a few seconds to index)
                await pollRegistrationUtxo();
            } else {
                logger.error('transactionState:', transactionState);
                throw new Error('transactionState:' + transactionState);
            }
        } catch (error) {
            logger.error('❌ DUST registration failed:', error);
            // Error is already handled by TransactionContext, no need to set it again
        }
    };

    return (
        <div className="w-full max-w-4xl lg:max-w-6xl mx-auto p-6">
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
                    balanceNight={cardano.balanceNight || ''}
                    address={cardano.address || ''}
                />
            )}

            {/* Step 3: Address Matching - Only show when both wallets connected */}
            {cardano.isConnected && midnight.isConnected && (
                <div className="space-y-4">
                    <MatchAddressesCard
                        cardanoWalletName={cardano.walletName || ''}
                        cardanoBalanceNight={cardano.balanceNight || ''}
                        cardanoBalanceADA={cardano.balanceADA || '0'}
                        cardanoAddress={cardano.address || ''}
                        onDisconnectCardano={() => {
                            disconnectCardanoWallet();
                            transaction.resetTransaction();
                        }}
                        midnightWalletName={midnight.walletName || ''}
                        midnightAddress={midnight.address || ''}
                        onDisconnectMidnight={() => {
                            disconnectMidnightWallet();
                            transaction.resetTransaction();
                        }}
                        onMatch={handleMatchAddresses}
                    />
                </div>
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

        </div>
    );
}
