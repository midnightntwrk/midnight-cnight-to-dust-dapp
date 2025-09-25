'use client';

import React, { useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, Button } from '@heroui/react';
import InfoIcon from '@/assets/icons/info.svg';
import CopyIcon from '@/assets/icons/copy.svg';
import Image from 'next/image';
import { useToast } from '@/hooks/useToast';
import ToastContainer from '../ui/ToastContainer';

interface StopGenerationModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    dustAddress?: string;
    onStopGeneration: () => void;
}

export default function StopGenerationModal({
    isOpen,
    onOpenChange,
    dustAddress,
    onStopGeneration
}: StopGenerationModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const { toasts, showToast, removeToast } = useToast();

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
                    type: 'success'
                });
            } catch (error) {
                showToast({
                    message: 'Failed to copy address',
                    type: 'error'
                });
            }
        }
    };

    const handleStopGeneration = async () => {
        setIsLoading(true);

        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        onStopGeneration();
        setIsLoading(false);
        onOpenChange(false);
    };

    const handleCancel = () => {
        if (!isLoading) {
            onOpenChange(false);
        }
    };

    return (
        <>
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
                            <span className="text-lg font-medium">Stop DUST generation</span>
                            <Image src={InfoIcon} alt="info" width={20} height={20} />
                        </div>
                    </ModalHeader>
                    <ModalBody className="pb-6">
                        {dustAddress && (
                            <div className="mb-4">
                                <div className="bg-[#2a2a2a] p-3 rounded-lg border border-gray-600 flex items-center justify-between">
                                    <span className="text-white text-sm font-mono">
                                        {handleFormatAddress(dustAddress)}
                                    </span>
                                    <Image
                                        src={CopyIcon}
                                        alt="copy"
                                        width={18}
                                        height={18}
                                        className="cursor-pointer hover:opacity-70"
                                        onClick={handleCopyAddress}
                                    />
                                </div>
                            </div>
                        )}

                        <p className="text-gray-300 text-sm mb-6">
                            This address will no longer receive your DUST tokens. Ensure you manage this address accordingly.
                        </p>

                        <div className="flex gap-3">
                            <Button
                                className="flex-1 bg-transparent border border-gray-600 text-gray-300 hover:bg-gray-700"
                                onPress={handleCancel}
                                isDisabled={isLoading}
                            >
                                CANCEL
                            </Button>
                            <Button
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                                onPress={handleStopGeneration}
                                isLoading={isLoading}
                                isDisabled={isLoading}
                            >
                                {isLoading ? 'STOPPING...' : 'STOP ADDRESS GENERATION'}
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