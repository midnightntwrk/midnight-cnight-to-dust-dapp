import { Button, Card } from '@heroui/react';
import Image from 'next/image';
import React from 'react';

import InfoIcon from '@/assets/icons/info.svg';
import CopyIcon from '@/assets/icons/copy.svg';
import CheckIcon from '@/assets/icons/check.svg';
import MidnightBg from '@/assets/midnight.svg';
import DustBalanceIcon from '@/assets/icons/DUST.svg';
import { useWalletContext } from '@/contexts/WalletContext';
import ToastContainer from '../ui/ToastContainer';
import { useToast } from '@/hooks/useToast';
import { useTransaction } from '@/contexts/TransactionContext';
import { useDustProtocol } from '@/contexts/DustProtocolContext';
import { LucidEvolution } from '@lucid-evolution/lucid';
import DustTransactionsUtils from '@/lib/dustTransactionsUtils';
import TransactionProgress from '@/components/ui/TransactionProgress';
import UpdateAddressModal from '../modals/UpdateAddressModal';
import StopGenerationModal from '../modals/StopGenerationModal';

const MidnightWalletCard = () => {
    const { toasts, showToast, removeToast } = useToast();
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [isStopModalOpen, setIsStopModalOpen] = useState(false);

    const { cardano, midnight, generationStatus, refetchGenerationStatus, findRegistrationUtxo, isLoadingRegistrationUtxo, registrationUtxo } = useWalletContext();

    // Use DUST protocol context
    const { contracts, protocolStatus } = useDustProtocol();

    // Transaction management
    const transaction = useTransaction();

    const handleUnregisterAddress = async () => {
        if (!cardano.lucid) {
            console.error('❌ Cardano wallet not connected');
            return;
        }

        // Check if dust protocol is ready first
        if (!protocolStatus?.isReady) {
            console.error('❌ Dust protocol not ready for unregistration');
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

        if (!registrationUtxo) {
            console.error('❌ Registration UTXO not found');
            transaction.setError('Registration UTXO not found. Please ensure you have registered your address.');
            return;
        }

        try {
            console.log('🚀 Starting DUST unregistration...');

            // Create the unregistration executor and execute it
            const unregistrationExecutor = DustTransactionsUtils.createUnregistrationExecutor(cardano.lucid as LucidEvolution, contracts, dustPKHValue, registrationUtxo);

            const transactionState = await transaction.executeTransaction('unregister', unregistrationExecutor, {}, cardano.lucid as LucidEvolution);

            // Only open success modal if transaction actually succeeded
            if (transactionState === 'success') {
                refetchGenerationStatus();
                findRegistrationUtxo();
            } else {
                console.error('transactionState:', transactionState);
                throw new Error('transactionState:' + transactionState);
            }
        } catch (error) {
            console.error('❌ DUST unregistration failed:', error);
            // Error is already handled by TransactionContext, no need to set it again
        }
    };

    const handleUpdateAddress = async () => {
        if (!cardano.lucid) {
            console.error('❌ Cardano wallet not connected');
            return;
        }

        // Check if dust protocol is ready first
        if (!protocolStatus?.isReady) {
            console.error('❌ Dust protocol not ready for update');
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

        if (!registrationUtxo) {
            console.error('❌ Registration UTXO not found');
            transaction.setError('Registration UTXO not found. Please ensure you have registered your address.');
            return;
        }

        try {
            console.log('🚀 Starting DUST update...');

            // Create the update executor and execute it
            const updateExecutor = DustTransactionsUtils.createUpdateExecutor(cardano.lucid as LucidEvolution, contracts, dustPKHValue, registrationUtxo);

            const transactionState = await transaction.executeTransaction('update', updateExecutor, {}, cardano.lucid as LucidEvolution);

            // Only open success modal if transaction actually succeeded
            if (transactionState === 'success') {
                refetchGenerationStatus();
                findRegistrationUtxo();
            } else {
                console.error('transactionState:', transactionState);
                throw new Error('transactionState:' + transactionState);
            }
        } catch (error) {
            console.error('❌ DUST update failed:', error);
            // Error is already handled by TransactionContext, no need to set it again
        }
    };

    const handleFormatWalletAddress = (address: string) => {
        return address.slice(0, 10) + '...' + address.slice(-10);
    };

    const handleCopyAddress = async () => {
        const addressToCopy = generationStatus?.dustAddress || midnight.address;
        if (addressToCopy) {
            try {
                await navigator.clipboard.writeText(addressToCopy);
                showToast({
                    message: 'DUST address copied to clipboard!',
                    type: 'success',
                });
            } catch {
                showToast({
                    message: 'Failed to copy address',
                    type: 'error',
                });
            }
        }
    };

    const handleAddressUpdate = (newAddress: string) => {
        console.log('Address updated to:', newAddress);
        showToast({
            message: 'DUST address updated successfully!',
            type: 'success'
        });
    };

    const handleStopGeneration = () => {
        console.log('Generation stopped');
        showToast({
            message: 'DUST generation stopped!',
            type: 'success'
        });
    };

    return (
        <Card className="bg-[#70707035] p-[24px] w-full lg:w-[40%] flex flex-col gap-4 relative pb-8">
            <div className="absolute top-1/2 right-[16px] transform -translate-y-1/2">
                <Image src={MidnightBg} alt="cardano bg" width={100} height={100} />
            </div>
            <div className="flex flex-row gap-2 z-10">
                <span className="text-[18px] font-normal">DUST Balance</span>
                <Image src={InfoIcon} alt="info" width={24} height={24} />
            </div>
            <div className="flex flex-row gap-2 items-center z-10">
                <Image src={DustBalanceIcon} alt="night balance" width={42} height={42} />
                <span className="text-[24px] font-bold">1000</span>
                <span className="text-[24px]">DUST</span>
            </div>
            <div className="flex flex-col gap-2">
                <div className="flex flex-row gap-2 items-center z-10">
                    <span className="text-[14px] font-normal text-gray-400">Destination Address Midnight</span>
                    <Image src={InfoIcon} alt="info" width={20} height={20} />
                </div>
                <div className="flex flex-row gap-2 items-center z-10">
                    <Image src={CheckIcon} alt="check" width={18} height={18} />
                    <span>{handleFormatWalletAddress(generationStatus?.dustAddress || midnight.address || '')}</span>
                    <Image src={CopyIcon} alt="copy" width={18} height={18} className="cursor-pointer hover:opacity-70" onClick={handleCopyAddress} />
                </div>
            </div>

            {/* Transaction Progress */}
            <div className="z-10 mt-4">
                <TransactionProgress />
            </div>

            <div className="flex z-10 mt-4 gap-4">
                <Button
                    className="bg-brand-primary hover:bg-brand-primary-hover text-white w-full py-2 text-sm disabled:bg-gray-600 disabled:text-gray-400"
                    radius="md"
                    size="sm"
                    onClick={handleUpdateAddress}
                    isLoading={isLoadingRegistrationUtxo || (transaction.isCurrentTransaction('update') && transaction.isAnyTransactionRunning())}
                    isDisabled={!protocolStatus?.isReady || isLoadingRegistrationUtxo || !registrationUtxo || transaction.isAnyTransactionRunning()}
                >
                    {transaction.isCurrentTransaction('update') && transaction.isAnyTransactionRunning()
                        ? 'UPDATING...'
                        : transaction.isCurrentTransaction('update') && transaction.transactionState === 'success'
                        ? 'ADDRESS UPDATED ✅'
                        : !protocolStatus?.isReady
                        ? 'DUST PROTOCOL NOT READY'
                        : isLoadingRegistrationUtxo
                        ? 'LOADING REGISTRATION UTXO...'
                        : !registrationUtxo
                        ? 'NO REGISTRATION FOUND'
                        : 'CHANGE ADDRESS'}
                </Button>
                <Button
                    className="bg-transparent border border-gray-600 text-gray-300 hover:bg-gray-700 w-full py-2 text-sm disabled:bg-gray-600 disabled:text-gray-400"
                    radius="md"
                    size="sm"
                    onClick={handleUnregisterAddress}
                    isLoading={isLoadingRegistrationUtxo || (transaction.isCurrentTransaction('unregister') && transaction.isAnyTransactionRunning())}
                    isDisabled={!protocolStatus?.isReady || isLoadingRegistrationUtxo || !registrationUtxo || transaction.isAnyTransactionRunning()}
                >
                    {transaction.isCurrentTransaction('unregister') && transaction.isAnyTransactionRunning()
                        ? 'UNREGISTERING...'
                        : transaction.isCurrentTransaction('unregister') && transaction.transactionState === 'success'
                        ? 'UNREGISTERED ✅'
                        : !protocolStatus?.isReady
                        ? 'DUST PROTOCOL NOT READY'
                        : isLoadingRegistrationUtxo
                        ? 'LOADING REGISTRATION UTXO...'
                        : !registrationUtxo
                        ? 'NO REGISTRATION FOUND'
                        : 'STOP GENERATION'}
                </Button>
            </div>

            {/* Toast Notifications */}
            <ToastContainer toasts={toasts} onRemove={removeToast} />

            {/* Modals */}
            <UpdateAddressModal
                isOpen={isUpdateModalOpen}
                onOpenChange={setIsUpdateModalOpen}
                currentAddress={generationStatus?.dustAddress || midnight.address}
                onAddressUpdate={handleAddressUpdate}
            />

            <StopGenerationModal
                isOpen={isStopModalOpen}
                onOpenChange={setIsStopModalOpen}
                dustAddress={generationStatus?.dustAddress || midnight.address}
                onStopGeneration={handleStopGeneration}
            />
        </Card>
    );
};

export default MidnightWalletCard;
