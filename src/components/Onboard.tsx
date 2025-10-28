'use client';
import { logger } from '@/lib/logger';
import { useTransaction } from '@/contexts/TransactionContext';
import { SupportedMidnightWallet, SupportedWallet, useWalletContext } from '@/contexts/WalletContext';
import { DustTransactionsUtils } from '@/lib/dustTransactionsUtils';
import type { LucidEvolution } from '@lucid-evolution/lucid';
import { useState } from 'react';
import ConnectCardanoCard from './onboard/ConnectCardanoCard';
import ConnectMidnightCard from './onboard/ConnectMidnightCard';
import MatchAddressesCard from './onboard/MatchAddressesCard';
import WalletsModal from './wallet-connect/WalletsModal';
import ToastContainer from './ui/ToastContainer';
import { useToast } from '@/hooks/useToast';

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

    // Transaction management
    const transaction = useTransaction();

    // Toast notifications
    const { toasts, showToast, removeToast } = useToast();

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

        // Get DUST PKH from midnight wallet
        const dustPKHValue = midnight.coinPublicKey;
        if (!dustPKHValue) {
            logger.error('❌ Midnight wallet coinPublicKey not available');
            transaction.setError('Midnight wallet coinPublicKey not available. Please reconnect your Midnight wallet.');
            return;
        }

        try {
            logger.log('Starting DUST registration...');

            // Create the registration executor and execute it
            const registrationExecutor = DustTransactionsUtils.createRegistrationExecutor(cardano.lucid as LucidEvolution, dustPKHValue);

            const transactionState = await transaction.executeTransaction('register', registrationExecutor, {}, cardano.lucid as LucidEvolution);

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
            showToast({
                message: error instanceof Error ? error.message : 'Registration failed',
                type: 'error',
                duration: 5000,
            });
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
            <WalletsModal isOpen={isCardanoModalOpen} onOpenChange={setIsCardanoModalOpen} wallets={getAvailableCardanoWallets()} handleWalletSelect={handleCardanoWalletSelect} />

            {/* Midnight Wallet Selection Modal */}
            <WalletsModal
                isOpen={isMidnightModalOpen}
                onOpenChange={setIsMidnightModalOpen}
                wallets={getAvailableMidnightWallets()}
                handleWalletSelect={handleMidnightWalletSelect}
            />

            {/* Toast Notifications */}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </div>
    );
}
