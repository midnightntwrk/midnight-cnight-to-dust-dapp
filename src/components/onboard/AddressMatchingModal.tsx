"use client";

import React from 'react';
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button
} from '@heroui/react';
import { useRouter } from 'next/navigation';

interface AddressMatchingModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function AddressMatchingModal({ isOpen, onOpenChange }: AddressMatchingModalProps) {
    const router = useRouter();

    const handleContinueToDashboard = () => {
        onOpenChange(false);
        router.push('/dashboard');
    };

    return (
        <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col gap-1">
                            Address Matching Initiated! 🎉
                        </ModalHeader>
                        <ModalBody>
                            <div className="space-y-4">
                                <p>Your addresses have been successfully matched!</p>
                                <div className="p-4 bg-success-50 rounded-lg">
                                    <p className="text-sm font-semibold mb-2">✅ What happens next:</p>
                                    <ul className="text-sm space-y-1 list-disc list-inside">
                                        <li>Your Cardano and Midnight addresses are now linked</li>
                                        <li>You can start generating private DUST from your cNIGHT holdings</li>
                                        <li>All transactions will be processed securely</li>
                                    </ul>
                                </div>
                            </div>
                        </ModalBody>
                        <ModalFooter>
                            <Button color="success" onPress={handleContinueToDashboard}>
                                Continue to Dashboard
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
}