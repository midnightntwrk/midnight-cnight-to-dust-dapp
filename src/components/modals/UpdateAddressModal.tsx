'use client';

import React, { useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, Button, Input } from '@heroui/react';
import InfoIcon from '@/assets/icons/info.svg';
import CheckIcon from '@/assets/icons/check.svg';
import Image from 'next/image';

interface UpdateAddressModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    currentAddress?: string;
    onAddressUpdate: (newAddress: string) => void;
}

export default function UpdateAddressModal({
    isOpen,
    onOpenChange,
    currentAddress,
    onAddressUpdate
}: UpdateAddressModalProps) {
    const [newAddress, setNewAddress] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showSuccessState, setShowSuccessState] = useState(false);

    const handleAddressChange = (value: string) => {
        setNewAddress(value);
    };

    const handleChangeAddress = async () => {
        if (!newAddress.trim()) return;

        setIsLoading(true);

        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Show success state
        setShowSuccessState(true);
        setIsLoading(false);

        // Auto close after showing success
        setTimeout(() => {
            onAddressUpdate(newAddress);
            handleClose();
        }, 2000);
    };

    const handleClose = () => {
        setNewAddress('');
        setIsLoading(false);
        setShowSuccessState(false);
        onOpenChange(false);
    };

    const handleCancel = () => {
        if (!isLoading) {
            handleClose();
        }
    };

    // Success state modal
    if (showSuccessState) {
        return (
            <Modal
                isOpen={isOpen}
                onOpenChange={onOpenChange}
                hideCloseButton={true}
                isDismissable={false}
                className="bg-[#1a1a1a] border border-gray-700"
                size="md"
            >
                <ModalContent>
                    <ModalHeader className="flex flex-col gap-1 text-white">
                        <div className="flex items-center gap-2">
                            <Image src={CheckIcon} alt="success" width={20} height={20} />
                            <span className="text-lg font-medium">Address changed</span>
                        </div>
                    </ModalHeader>
                    <ModalBody className="pb-6">
                        <p className="text-gray-300 text-sm mb-4">
                            This address will receive your generated DUST tokens.
                        </p>

                        <div className="bg-[#2a2a2a] p-3 rounded-lg border border-gray-600">
                            <p className="text-white text-sm font-mono break-all">
                                {newAddress}
                            </p>
                        </div>

                        <div className="mt-4">
                            <Button
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                onPress={() => {
                                    // This will be handled by the setTimeout in handleChangeAddress
                                }}
                            >
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
            isDismissable={!isLoading}
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
                        <Input
                            type="text"
                            placeholder="Enter your DUST public address"
                            value={newAddress}
                            onValueChange={handleAddressChange}
                            className="w-full"
                            classNames={{
                                input: "bg-[#2a2a2a] border-gray-600 text-white placeholder:text-gray-500",
                                inputWrapper: "bg-[#2a2a2a] border-gray-600 hover:border-gray-500 focus-within:border-blue-500"
                            }}
                            isDisabled={isLoading}
                        />
                    </div>

                    <div className="flex gap-3">
                        <Button
                            className="flex-1 bg-transparent border border-gray-600 text-gray-300 hover:bg-gray-700"
                            onPress={handleCancel}
                            isDisabled={isLoading}
                        >
                            CANCEL
                        </Button>
                        <Button
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                            onPress={handleChangeAddress}
                            isLoading={isLoading}
                            isDisabled={!newAddress.trim() || isLoading}
                        >
                            {isLoading ? 'CHANGING...' : 'CHANGE ADDRESS'}
                        </Button>
                    </div>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
}