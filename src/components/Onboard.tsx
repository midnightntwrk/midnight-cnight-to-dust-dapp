'use client'

import React, { useState } from 'react';
import { useWalletContext } from '@/contexts/WalletContext';
import { SupportedWallet } from '@/hooks/useCardanoWallet';
import { SupportedMidnightWallet } from '@/hooks/useMidnightWallet';
import {
    Card,
    CardBody,
    CardHeader,
    Button,
    Progress,
    Chip,
    Divider,
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    useDisclosure
} from '@heroui/react';
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
        getAvailableMidnightWallets
    } = useWalletContext();

    const [currentStep, setCurrentStep] = useState(1);
    const [isCardanoModalOpen, setIsCardanoModalOpen] = useState(false);
    const [isMidnightModalOpen, setIsMidnightModalOpen] = useState(false);

    const { isOpen: isMatchModalOpen, onOpen: onMatchModalOpen, onOpenChange: onMatchModalChange } = useDisclosure();

    // Wallet display names and icons
    const cardanoWalletInfo = {
        nami: { name: 'Nami', icon: '🦎' },
        eternl: { name: 'Eternl', icon: '♾️' },
        lace: { name: 'Lace', icon: '🎭' },
        flint: { name: 'Flint', icon: '🔥' },
        typhoncip30: { name: 'Typhon', icon: '🌪️' },
        nufi: { name: 'NuFi', icon: '💎' },
        gero: { name: 'GeroWallet', icon: '⚡' },
        ccvault: { name: 'CCVault', icon: '🛡️' },
    };

    const midnightWalletInfo = {
        mnLace: { name: 'Lace (Midnight)', icon: '🌙' },
    };

    // To be implemented
    // const handleRegister = async () => {
    //     // Build, sign and submit transaction
    //     const tx = await cardano.lucid
    //         .newTx()
    //         .payToContract(
    //             contractAddress: '',
    //             { inline: datum },
    //             { lovelace: 2000000n } // amount in lovelace
    //         )
    //         .complete(); // Balance the transaction and initiate UTxO selection
    //     const signedTx = await tx.sign.withWallet().complete();
    //     const txHash = await signedTx.submit();
    // }

    const handleCardanoWalletSelect = async (wallet: SupportedWallet | SupportedMidnightWallet) => {
        await connectCardanoWallet(wallet as SupportedWallet);
        setIsCardanoModalOpen(false);
        if (!cardano.error) {
            setCurrentStep(2);
        }
    };

    const handleMidnightWalletSelect = async (wallet: SupportedWallet | SupportedMidnightWallet) => {
        await connectMidnightWallet(wallet as SupportedMidnightWallet);
        setIsMidnightModalOpen(false);
        if (!midnight.error) {
            setCurrentStep(3);
        }
    };

    const handleMatchAddresses = () => {
        // This is where you'll implement the address matching logic
        onMatchModalOpen();
    };

    // Calculate progress percentage
    const getProgress = () => {
        if (currentStep === 1 && !cardano.isConnected) return 0;
        if (currentStep === 2 && cardano.isConnected && !midnight.isConnected) return 33;
        if (currentStep === 3 && cardano.isConnected && midnight.isConnected) return 100;
        return (currentStep - 1) * 33;
    };

    return (
        <div className="max-w-2xl mx-auto p-6">
            {/* Header */}
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-2">Wallet Onboarding</h1>
                <p className="text-gray-500">Connect your Cardano and Midnight wallets to get started</p>
            </div>

            {/* Progress Bar */}
            <div className="mb-8">
                <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Progress</span>
                    <span className="text-sm font-medium">{Math.round(getProgress())}%</span>
                </div>
                <Progress
                    value={getProgress()}
                    color="primary"
                    className="mb-4"
                />
                <div className="flex justify-between text-xs text-gray-500">
                    <span className={cardano.isConnected ? 'text-success font-medium' : ''}>
                        ✓ Cardano Wallet
                    </span>
                    <span className={midnight.isConnected ? 'text-success font-medium' : ''}>
                        ✓ Midnight Wallet
                    </span>
                    <span className={cardano.isConnected && midnight.isConnected ? 'text-success font-medium' : ''}>
                        ✓ Ready to Match
                    </span>
                </div>
            </div>

            {/* Step 1: Cardano Wallet Connection */}
            <Card className="mb-6">
                <CardHeader className="flex gap-3">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <Chip size="sm" color={cardano.isConnected ? 'success' : 'primary'} variant="flat">
                                Step 1
                            </Chip>
                            <p className="text-lg font-semibold">Connect Cardano Wallet</p>
                            {cardano.isConnected && <span className="text-success">✅</span>}
                        </div>
                        <p className="text-small text-gray-500">Connect your CIP-30 compatible Cardano wallet</p>
                    </div>
                </CardHeader>
                <CardBody>
                    {!cardano.isConnected ? (
                        <div className="space-y-4">
                            <Button
                                color="primary"
                                size="lg"
                                onPress={() => setIsCardanoModalOpen(true)}
                                isLoading={cardano.isLoading}
                                className="w-full"
                            >
                                {cardano.isLoading ? 'Connecting...' : '🔗 Connect Cardano Wallet'}
                            </Button>
                            {cardano.error && (
                                <div className="text-danger text-sm p-3 bg-danger-50 rounded-lg">
                                    ❌ {cardano.error}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="p-4 bg-success-50 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-2xl">{cardanoWalletInfo[cardano.walletName as SupportedWallet]?.icon}</span>
                                    <span className="font-semibold">{cardanoWalletInfo[cardano.walletName as SupportedWallet]?.name}</span>
                                </div>
                                <p className="text-sm text-gray-600 mb-1">
                                    <strong>Balance:</strong> {cardano.balance} ADA
                                </p>
                                <p className="text-sm text-gray-600 font-mono">
                                    <strong>Address:</strong> {cardano.address?.slice(0, 20)}...{cardano.address?.slice(-10)}
                                </p>
                            </div>
                            <Button
                                size="sm"
                                variant="light"
                                color="danger"
                                onPress={() => {
                                    disconnectCardanoWallet();
                                    setCurrentStep(1);
                                }}
                            >
                                Disconnect Cardano Wallet
                            </Button>
                        </div>
                    )}
                </CardBody>
            </Card>

            {/* Step 2: Midnight Wallet Connection */}
            <Card className={`mb-6 ${!cardano.isConnected ? 'opacity-50 pointer-events-none' : ''}`}>
                <CardHeader className="flex gap-3">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <Chip size="sm" color={midnight.isConnected ? 'success' : cardano.isConnected ? 'primary' : 'default'} variant="flat">
                                Step 2
                            </Chip>
                            <p className="text-lg font-semibold">Connect Midnight Wallet</p>
                            {midnight.isConnected && <span className="text-success">✅</span>}
                        </div>
                        <p className="text-small text-gray-500">Connect your Midnight wallet for private transactions</p>
                    </div>
                </CardHeader>
                <CardBody>
                    {!midnight.isConnected ? (
                        <div className="space-y-4">
                            <Button
                                color="secondary"
                                size="lg"
                                onPress={() => setIsMidnightModalOpen(true)}
                                isLoading={midnight.isLoading}
                                disabled={!cardano.isConnected}
                                className="w-full"
                            >
                                {midnight.isLoading ? 'Connecting...' : '🌙 Connect Midnight Wallet'}
                            </Button>
                            {!cardano.isConnected && (
                                <div className="text-warning text-sm p-3 bg-warning-50 rounded-lg">
                                    ⚠️ Please connect your Cardano wallet first
                                </div>
                            )}
                            {midnight.error && (
                                <div className="text-danger text-sm p-3 bg-danger-50 rounded-lg">
                                    ❌ {midnight.error}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="p-4 bg-secondary-50 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-2xl">{midnightWalletInfo[midnight.walletName as SupportedMidnightWallet]?.icon}</span>
                                    <span className="font-semibold">{midnightWalletInfo[midnight.walletName as SupportedMidnightWallet]?.name}</span>
                                </div>
                                <p className="text-sm text-gray-600 mb-1">
                                    <strong>Balance:</strong> {midnight.balance}
                                </p>
                                <p className="text-sm text-gray-600 font-mono">
                                    <strong>Shield Address:</strong> {midnight.address?.slice(0, 30)}...{midnight.address?.slice(-15)}
                                </p>
                                <p className="text-xs text-gray-500 mt-2">🛡️ Private shielded address for enhanced privacy</p>
                            </div>
                            <Button
                                size="sm"
                                variant="light"
                                color="danger"
                                onPress={() => {
                                    disconnectMidnightWallet();
                                    setCurrentStep(2);
                                }}
                            >
                                Disconnect Midnight Wallet
                            </Button>
                        </div>
                    )}
                </CardBody>
            </Card>

            {/* Step 3: Address Matching */}
            {cardano.isConnected && midnight.isConnected && (
                <Card className="mb-6">
                    <CardHeader className="flex gap-3">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <Chip size="sm" color="success" variant="flat">
                                    Step 3
                                </Chip>
                                <p className="text-lg font-semibold">Ready to Match Addresses</p>
                                <span className="text-success">🎉</span>
                            </div>
                            <p className="text-small text-gray-500">Both wallets connected! Ready to link your addresses</p>
                        </div>
                    </CardHeader>
                    <CardBody>
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <div className="p-4 bg-primary-50 rounded-lg border">
                                    <p className="text-sm font-semibold text-primary mb-2">🏦 Cardano Address:</p>
                                    <p className="font-mono text-sm break-all">{cardano.address}</p>
                                </div>

                                <div className="p-4 bg-secondary-50 rounded-lg border">
                                    <p className="text-sm font-semibold text-secondary mb-2">🌙 Midnight Address:</p>
                                    <p className="font-mono text-sm break-all">{midnight.address}</p>
                                </div>
                            </div>

                            <Divider />

                            <Button
                                color="success"
                                size="lg"
                                className="w-full"
                                onPress={handleMatchAddresses}
                            >
                                🔗 Match My Addresses
                            </Button>
                        </div>
                    </CardBody>
                </Card>
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

            {/* Address Matching Confirmation Modal */}
            <Modal isOpen={isMatchModalOpen} onOpenChange={onMatchModalChange}>
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
                                <Button color="success" onPress={onClose}>
                                    Continue to Dashboard
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </div>
    );
}