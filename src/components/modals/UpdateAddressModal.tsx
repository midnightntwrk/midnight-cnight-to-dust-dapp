'use client';

import React, { useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, Button, Input } from '@heroui/react';
import InfoIcon from '@/assets/icons/info.svg';
import CheckIcon from '@/assets/icons/check.svg';
import Image from 'next/image';
import { useTransaction } from '@/contexts/TransactionContext';
import TransactionProgress from '../ui/TransactionProgress';
import { useRouter } from 'next/navigation';

interface UpdateAddressModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onAddressUpdate: () => Promise<void>;
}

export default function UpdateAddressModal({ isOpen, onOpenChange, onAddressUpdate }: UpdateAddressModalProps) {
    const [newAddress, setNewAddress] = useState('');
    const router = useRouter();
    const transaction = useTransaction();

    const handleAddressChange = (value: string) => {
        setNewAddress(value);
    };

    const handleChangeAddress = async () => {
        if (!newAddress.trim()) return;
        await onAddressUpdate();
    };

    const handleClose = () => {
        if (!transaction.isAnyTransactionRunning()) {
            setNewAddress('');
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
        );
    }

    return (
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
                    <p className="text-gray-300 text-sm mb-4">This address will receive your generated DUST tokens. Make sure you control this address.</p>

                    <div className="mb-4">
                        <Input
                            type="text"
                            placeholder="Enter your DUST public address"
                            value={newAddress}
                            onValueChange={handleAddressChange}
                            className="w-full"
                            classNames={{
                                input: 'bg-[#2a2a2a] border-gray-600 text-white placeholder:text-gray-500',
                                inputWrapper: 'bg-[#2a2a2a] border-gray-600 hover:border-gray-500 focus-within:border-blue-500',
                            }}
                            isDisabled={transaction.isAnyTransactionRunning()}
                        />
                    </div>

                    <div className="mt-4">
                        <TransactionProgress />
                    </div>

                    <div className="flex gap-3 mt-4">
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
                            isDisabled={!newAddress.trim() || transaction.isAnyTransactionRunning()}
                        >
                            {transaction.isCurrentTransaction('update') && transaction.isAnyTransactionRunning() ? 'UPDATING...' : 'CHANGE ADDRESS'}
                        </Button>
                    </div>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
}
