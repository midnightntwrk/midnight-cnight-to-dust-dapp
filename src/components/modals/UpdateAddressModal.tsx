'use client';

import React, { useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, Button, Textarea } from '@heroui/react';
import InfoIcon from '@/assets/icons/info.svg';
import CheckIcon from '@/assets/icons/check.svg';
import Image from 'next/image';
import { useTransaction } from '@/contexts/TransactionContext';
import { useRouter } from 'next/navigation';
import { bech32m } from 'bech32';
import ToastContainer from '../ui/ToastContainer';
import { useToast } from '@/hooks/useToast';
import { extractCoinPublicKeyFromMidnightAddress } from '@/lib/utils';

interface UpdateAddressModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onAddressUpdate: (newAddress: string, newCoinPublicKey: string) => Promise<void>;
}

export default function UpdateAddressModal({ isOpen, onOpenChange, onAddressUpdate }: UpdateAddressModalProps) {
    const [newAddress, setNewAddress] = useState('');
    const [isValidAddress, setIsValidAddress] = useState(true);
    const router = useRouter();
    const transaction = useTransaction();
    const { toasts, showToast, removeToast } = useToast();

    const validateBech32Address = (address: string): boolean => {
        if (!address.trim()) {
            return true; // Empty is valid (not an error state)
        }
        try {
            // Midnight addresses use bech32m format with higher length limit
            bech32m.decode(address, 200);
            return true;
        } catch {
            return false;
        }
    };

    const handleAddressChange = (value: string) => {
        setNewAddress(value);
        setIsValidAddress(validateBech32Address(value));
    };

    const handleChangeAddress = async () => {
        if (!newAddress.trim()) return;

        // Extract coin public key from the new Midnight address
        const newCoinPublicKey = extractCoinPublicKeyFromMidnightAddress(newAddress.trim());

        if (!newCoinPublicKey) {
            showToast({
                message: 'Failed to extract coin public key from address. Please check the address format.',
                type: 'error'
            });
            return;
        }

        console.log('🔄 Update Address:', {
            newAddress: newAddress.trim(),
            extractedCoinPublicKey: newCoinPublicKey,
            coinPublicKeyLength: newCoinPublicKey.length
        });

        try {
            await onAddressUpdate(newAddress.trim(), newCoinPublicKey);
        } catch (error) {
            showToast({
                message: error instanceof Error ? error.message : 'Failed to update address',
                type: 'error'
            });
        }
    };

    const handleClose = () => {
        if (!transaction.isAnyTransactionRunning()) {
            setNewAddress('');
            setIsValidAddress(true);
            onOpenChange(false);
        }
    };

    const handleCancel = () => {
        if (!transaction.isAnyTransactionRunning()) {
            handleClose();
        }
    };

    const handleContinueToDashboard = () => {
        transaction.resetTransaction();
        setNewAddress('');
        onOpenChange(false);
        router.push('/dashboard');
    };

    // Success state modal
    if (transaction.isCurrentTransaction('update') && transaction.transactionState === 'success') {
        return (
            <>
                <Modal isOpen={isOpen} onOpenChange={onOpenChange} hideCloseButton={true} isDismissable={false} className="bg-[#1a1a1a] border border-gray-700" size="md">
                    <ModalContent>
                        <ModalHeader className="flex flex-col gap-1 text-white">
                            <div className="flex items-center gap-2">
                                <Image src={CheckIcon} alt="success" width={20} height={20} />
                                <span className="text-lg font-medium">Address changed</span>
                            </div>
                        </ModalHeader>
                        <ModalBody className="pb-6">
                            <p className="text-gray-300 text-sm mb-4">This address will receive your generated DUST tokens.</p>

                            <div className="bg-[#2a2a2a] p-3 rounded-lg border border-gray-600">
                                <p className="text-white text-sm font-mono break-all">{newAddress}</p>
                            </div>

                            <div className="mt-4">
                                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onPress={handleContinueToDashboard}>
                                    GO TO DASHBOARD
                                </Button>
                            </div>
                        </ModalBody>
                    </ModalContent>
                </Modal>
                <ToastContainer toasts={toasts} onRemove={removeToast} />
            </>
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
                            <span className="text-lg font-medium">DUST Address Update</span>
                            <Image src={InfoIcon} alt="info" width={20} height={20} />
                        </div>
                    </ModalHeader>
                    <ModalBody className="pb-6">
                        <p className="text-gray-300 text-sm mb-4">
                            This address will receive your generated DUST tokens. Make sure you control this address.
                        </p>

                        <div className="mb-4">
                            <Textarea
                                placeholder="Enter your DUST public address"
                                value={newAddress}
                                onValueChange={handleAddressChange}
                                className="w-full"
                                classNames={{
                                    input: 'bg-[#2a2a2a] border-gray-600 text-white placeholder:text-gray-500',
                                    inputWrapper: `bg-[#2a2a2a] border-gray-600 hover:border-gray-500 focus-within:border-blue-500 ${!isValidAddress ? '!border-red-500' : ''}`,
                                }}
                                minRows={3}
                                maxRows={3}
                                isDisabled={transaction.isAnyTransactionRunning()}
                                isInvalid={!isValidAddress}
                                errorMessage={!isValidAddress ? 'Invalid bech32 address format' : ''}
                            />
                        </div>

                        <div className="flex gap-3">
                            <Button
                                className="flex-1 bg-transparent border border-gray-600 text-gray-300 hover:bg-gray-700"
                                onPress={handleCancel}
                                isDisabled={transaction.isAnyTransactionRunning()}
                            >
                                CANCEL
                            </Button>
                            <Button
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-600 disabled:text-gray-400"
                                onPress={handleChangeAddress}
                                isLoading={transaction.isCurrentTransaction('update') && transaction.isAnyTransactionRunning()}
                                isDisabled={!newAddress.trim() || !isValidAddress || transaction.isAnyTransactionRunning()}
                            >
                                {transaction.isCurrentTransaction('update') && transaction.isAnyTransactionRunning() ? 'UPDATING...' : 'CHANGE ADDRESS'}
                            </Button>
                        </div>
                    </ModalBody>
                </ModalContent>
            </Modal>
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </>
    );
}
