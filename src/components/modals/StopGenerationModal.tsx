'use client';

import React from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, Button } from '@heroui/react';
import InfoIcon from '@/assets/icons/info.svg';
import CheckIcon from '@/assets/icons/check.svg';
import CopyIcon from '@/assets/icons/copy.svg';
import Image from 'next/image';
import { useToast } from '@/hooks/useToast';
import ToastContainer from '../ui/ToastContainer';
import { useTransaction } from '@/contexts/TransactionContext';
import { useRouter } from 'next/navigation';
import TransactionProgress from '../ui/TransactionProgress';

interface StopGenerationModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    dustAddress: string | null;
    onStopGeneration: () => Promise<void>;
}

export default function StopGenerationModal({ isOpen, onOpenChange, dustAddress, onStopGeneration }: StopGenerationModalProps) {
    const { toasts, showToast, removeToast } = useToast();
    const router = useRouter();
    const transaction = useTransaction();

    const handleFormatAddress = (address: string) => {
        if (!address) return '';
        return `${address.slice(0, 15)}...${address.slice(-15)}`;
    };

    const handleCopyAddress = async () => {
        if (dustAddress) {
            try {
                await navigator.clipboard.writeText(dustAddress);
                showToast({
                    message: 'Address copied to clipboard!',
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

    const handleStop = async () => {
        try {
            await onStopGeneration();
        } catch (error) {
            showToast({
                message: error instanceof Error ? error.message : 'Failed to stop generation',
                type: 'error',
                duration: 5000,
            });
        }
    };

    const handleCancel = () => {
        if (!transaction.isAnyTransactionRunning()) {
            onOpenChange(false);
        }
    };

    const handleContinueToDashboard = () => {
        transaction.resetTransaction();
        onOpenChange(false);
        router.push('/dashboard');
    };

    // Success state modal
    if (transaction.isCurrentTransaction('unregister') && transaction.transactionState === 'success') {
        return (
            <Modal isOpen={isOpen} onOpenChange={onOpenChange} hideCloseButton={true} isDismissable={false} className="bg-[#1a1a1a] border border-gray-700" size="md">
                <ModalContent>
                    <ModalHeader className="flex flex-col gap-1 text-white">
                        <div className="flex items-center gap-2">
                            <Image src={CheckIcon} alt="success" width={20} height={20} />
                            <span className="text-lg font-medium">Address deregistered</span>
                        </div>
                    </ModalHeader>
                    <ModalBody className="pb-6">
                        <p className="text-gray-300 text-sm mb-4">This address will no longer receive your generated DUST tokens.</p>

                        <div className="bg-[#2a2a2a] p-3 rounded-lg border border-gray-600">
                            <p className="text-white text-sm font-mono break-all">{dustAddress}</p>
                        </div>
                    </ModalBody>
                </ModalContent>
            </Modal>
        );
    }

    return (
        <>
            <Modal
                isOpen={isOpen}
                onOpenChange={onOpenChange}
                hideCloseButton={true}
                isDismissable={!transaction.isAnyTransactionRunning()}
                className="bg-[#1a1a1a] border border-gray-700"
                size="md"
            >
                <ModalContent>
                    <ModalHeader className="flex flex-col gap-1 text-white">
                        <div className="flex items-center gap-2">
                            <span className="text-lg font-medium">Stop DUST generation</span>
                            <Image src={InfoIcon} alt="info" width={20} height={20} />
                        </div>
                    </ModalHeader>
                    <ModalBody className="pb-6">
                        {dustAddress && (
                            <div className="mb-4">
                                <div className="bg-[#2a2a2a] p-3 rounded-lg border border-gray-600 flex items-center justify-between">
                                    <span className="text-white text-sm font-mono">{handleFormatAddress(dustAddress)}</span>
                                    <Image src={CopyIcon} alt="copy" width={18} height={18} className="cursor-pointer hover:opacity-70" onClick={handleCopyAddress} />
                                </div>
                            </div>
                        )}

                        <p className="text-gray-300 text-sm mb-4">This address will no longer receive your DUST tokens. Ensure you manage this address accordingly.</p>

                        <div className="flex gap-3">
                            <Button
                                className="flex-1 bg-transparent border border-gray-600 text-gray-300 hover:bg-gray-700"
                                onPress={handleCancel}
                                isDisabled={transaction.isAnyTransactionRunning()}
                            >
                                CANCEL
                            </Button>
                            <Button
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-600 disabled:text-gray-400"
                                onPress={handleStop}
                                isLoading={transaction.isCurrentTransaction('unregister') && transaction.isAnyTransactionRunning()}
                                isDisabled={transaction.isAnyTransactionRunning()}
                            >
                                {transaction.isCurrentTransaction('unregister') && transaction.isAnyTransactionRunning()
                                    ? 'UNREGISTERING...'
                                    : transaction.isCurrentTransaction('unregister') && transaction.transactionState === 'success'
                                      ? 'UNREGISTERED ✅'
                                      : 'STOP GENERATION'}
                            </Button>
                        </div>
                    </ModalBody>
                </ModalContent>
            </Modal>

            {/* Toast Notifications */}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </>
    );
}
