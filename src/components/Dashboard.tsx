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
    Chip,
    Divider,
    Badge,
    Avatar,
    Link,
    Spacer,
    Progress
} from '@heroui/react';
import WalletsModal from './wallet-connect/WalletsModal';

export default function Dashboard() {
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

    const [isCardanoModalOpen, setIsCardanoModalOpen] = useState(false);
    const [isMidnightModalOpen, setIsMidnightModalOpen] = useState(false);

    // Wallet display names and icons
    const cardanoWalletInfo = {
        nami: { name: 'Nami', icon: '🦎', color: 'success' },
        eternl: { name: 'Eternl', icon: '♾️', color: 'primary' },
        lace: { name: 'Lace', icon: '🎭', color: 'secondary' },
        flint: { name: 'Flint', icon: '🔥', color: 'warning' },
        typhoncip30: { name: 'Typhon', icon: '🌪️', color: 'primary' },
        nufi: { name: 'NuFi', icon: '💎', color: 'secondary' },
        gero: { name: 'GeroWallet', icon: '⚡', color: 'warning' },
        ccvault: { name: 'CCVault', icon: '🛡️', color: 'default' },
    };

    const midnightWalletInfo = {
        mnLace: { name: 'Lace (Midnight)', icon: '🌙', color: 'secondary' },
    };

    const handleCardanoWalletSelect = async (wallet: SupportedWallet | SupportedMidnightWallet) => {
        await connectCardanoWallet(wallet as SupportedWallet);
        setIsCardanoModalOpen(false);
    };

    const handleMidnightWalletSelect = async (wallet: SupportedWallet | SupportedMidnightWallet) => {
        await connectMidnightWallet(wallet as SupportedMidnightWallet);
        setIsMidnightModalOpen(false);
    };

    // Calculate wallet connection status
    const getConnectionStatus = () => {
        const cardanoConnected = cardano.isConnected;
        const midnightConnected = midnight.isConnected;
        
        if (cardanoConnected && midnightConnected) return { status: 'Both Connected', color: 'success', percentage: 100 };
        if (cardanoConnected || midnightConnected) return { status: 'Partially Connected', color: 'warning', percentage: 50 };
        return { status: 'Not Connected', color: 'danger', percentage: 0 };
    };

    const connectionStatus = getConnectionStatus();

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // You could add a toast notification here
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Wallet Dashboard</h1>
                    <p className="text-gray-500">Manage your Cardano and Midnight wallet connections</p>
                </div>
                
                <div className="flex items-center gap-4">
                    <Badge 
                        color={connectionStatus.color as any} 
                        variant="flat" 
                        size="lg"
                        className="px-3 py-1"
                    >
                        {connectionStatus.status}
                    </Badge>
                </div>
            </div>

            {/* Connection Overview */}
            <Card className="mb-8">
                <CardHeader className="flex gap-3">
                    <div className="flex flex-col">
                        <p className="text-lg font-semibold">Connection Status</p>
                        <p className="text-small text-gray-500">Overview of your wallet connections</p>
                    </div>
                </CardHeader>
                <CardBody>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Overall Connection Progress</span>
                            <span className="text-sm font-medium">{connectionStatus.percentage}%</span>
                        </div>
                        <Progress 
                            value={connectionStatus.percentage} 
                            color={connectionStatus.color as any}
                            className="mb-4"
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${cardano.isConnected ? 'bg-success' : 'bg-default-300'}`} />
                                <span className="text-sm">Cardano Wallet</span>
                                <Chip 
                                    size="sm" 
                                    color={cardano.isConnected ? 'success' : 'default'} 
                                    variant="flat"
                                >
                                    {cardano.isConnected ? 'Connected' : 'Disconnected'}
                                </Chip>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${midnight.isConnected ? 'bg-secondary' : 'bg-default-300'}`} />
                                <span className="text-sm">Midnight Wallet</span>
                                <Chip 
                                    size="sm" 
                                    color={midnight.isConnected ? 'secondary' : 'default'} 
                                    variant="flat"
                                >
                                    {midnight.isConnected ? 'Connected' : 'Disconnected'}
                                </Chip>
                            </div>
                        </div>
                    </div>
                </CardBody>
            </Card>

            {/* Wallet Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Cardano Wallet Card */}
                <Card className="min-h-[400px]">
                    <CardHeader className="flex gap-3 pb-2">
                        <Avatar
                            isBordered
                            radius="sm"
                            size="sm"
                            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%230066CC'%3E%3Cpath d='M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z'/%3E%3C/svg%3E"
                        />
                        <div className="flex flex-col flex-1">
                            <div className="flex items-center gap-2">
                                <p className="text-lg font-semibold">Cardano Wallet</p>
                                <Chip 
                                    size="sm" 
                                    color={cardano.isConnected ? 'success' : 'default'} 
                                    variant="dot"
                                >
                                    {cardano.isConnected ? 'Active' : 'Inactive'}
                                </Chip>
                            </div>
                            <p className="text-small text-gray-500">CIP-30 Compatible Wallet</p>
                        </div>
                    </CardHeader>
                    <Divider />
                    <CardBody className="flex-1">
                        {cardano.isConnected ? (
                            <div className="space-y-6 flex-1 flex flex-col">
                                {/* Wallet Info */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 p-3 bg-primary-50 rounded-lg">
                                        <span className="text-2xl">
                                            {cardanoWalletInfo[cardano.walletName as SupportedWallet]?.icon}
                                        </span>
                                        <div>
                                            <p className="font-semibold">
                                                {cardanoWalletInfo[cardano.walletName as SupportedWallet]?.name}
                                            </p>
                                            <p className="text-sm text-gray-600">Connected Successfully</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-sm font-medium text-gray-700 mb-1">Balance</p>
                                            <p className="text-2xl font-bold text-primary">{cardano.balance} ADA</p>
                                        </div>

                                        <div>
                                            <p className="text-sm font-medium text-gray-700 mb-1">Wallet Address</p>
                                            <div className="p-3 bg-gray-50 rounded-lg">
                                                <p className="font-mono text-xs break-all text-gray-800">
                                                    {cardano.address}
                                                </p>
                                                <Button
                                                    size="sm"
                                                    variant="light"
                                                    className="mt-2"
                                                    onPress={() => copyToClipboard(cardano.address || '')}
                                                >
                                                    📋 Copy Address
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <Spacer />

                                {/* Actions */}
                                <div className="space-y-2">
                                    <Button
                                        color="danger"
                                        variant="light"
                                        onPress={disconnectCardanoWallet}
                                        className="w-full"
                                        size="lg"
                                    >
                                        Disconnect Cardano Wallet
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                                    <span className="text-2xl">🏦</span>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-700 mb-1">No Cardano Wallet Connected</p>
                                    <p className="text-sm text-gray-500 mb-4">Connect your CIP-30 compatible wallet to get started</p>
                                </div>
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
                                    <div className="text-danger text-sm p-3 bg-danger-50 rounded-lg w-full">
                                        ❌ {cardano.error}
                                    </div>
                                )}
                            </div>
                        )}
                    </CardBody>
                </Card>

                {/* Midnight Wallet Card */}
                <Card className="min-h-[400px]">
                    <CardHeader className="flex gap-3 pb-2">
                        <Avatar
                            isBordered
                            radius="sm"
                            size="sm"
                            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23512DA8'%3E%3Cpath d='M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'/%3E%3C/svg%3E"
                        />
                        <div className="flex flex-col flex-1">
                            <div className="flex items-center gap-2">
                                <p className="text-lg font-semibold">Midnight Wallet</p>
                                <Chip 
                                    size="sm" 
                                    color={midnight.isConnected ? 'secondary' : 'default'} 
                                    variant="dot"
                                >
                                    {midnight.isConnected ? 'Active' : 'Inactive'}
                                </Chip>
                            </div>
                            <p className="text-small text-gray-500">Privacy-Enhanced Wallet</p>
                        </div>
                    </CardHeader>
                    <Divider />
                    <CardBody className="flex-1">
                        {midnight.isConnected ? (
                            <div className="space-y-6 flex-1 flex flex-col">
                                {/* Wallet Info */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 p-3 bg-secondary-50 rounded-lg">
                                        <span className="text-2xl">
                                            {midnightWalletInfo[midnight.walletName as SupportedMidnightWallet]?.icon}
                                        </span>
                                        <div>
                                            <p className="font-semibold">
                                                {midnightWalletInfo[midnight.walletName as SupportedMidnightWallet]?.name}
                                            </p>
                                            <p className="text-sm text-gray-600">Connected Successfully</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-sm font-medium text-gray-700 mb-1">Balance</p>
                                            <p className="text-lg font-bold text-secondary">{midnight.balance}</p>
                                            <p className="text-xs text-gray-500">🛡️ Shielded balance for privacy</p>
                                        </div>

                                        <div>
                                            <p className="text-sm font-medium text-gray-700 mb-1">Shield Address</p>
                                            <div className="p-3 bg-gray-50 rounded-lg">
                                                <p className="font-mono text-xs break-all text-gray-800">
                                                    {midnight.address}
                                                </p>
                                                <Button
                                                    size="sm"
                                                    variant="light"
                                                    className="mt-2"
                                                    onPress={() => copyToClipboard(midnight.address || '')}
                                                >
                                                    📋 Copy Shield Address
                                                </Button>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2">
                                                🔒 Private address for enhanced transaction privacy
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <Spacer />

                                {/* Actions */}
                                <div className="space-y-2">
                                    <Button
                                        color="danger"
                                        variant="light"
                                        onPress={disconnectMidnightWallet}
                                        className="w-full"
                                        size="lg"
                                    >
                                        Disconnect Midnight Wallet
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                                    <span className="text-2xl">🌙</span>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-700 mb-1">No Midnight Wallet Connected</p>
                                    <p className="text-sm text-gray-500 mb-4">Connect your Midnight wallet for private transactions</p>
                                </div>
                                <Button
                                    color="secondary"
                                    size="lg"
                                    onPress={() => setIsMidnightModalOpen(true)}
                                    isLoading={midnight.isLoading}
                                    className="w-full"
                                >
                                    {midnight.isLoading ? 'Connecting...' : '🌙 Connect Midnight Wallet'}
                                </Button>
                                {midnight.error && (
                                    <div className="text-danger text-sm p-3 bg-danger-50 rounded-lg w-full">
                                        ❌ {midnight.error}
                                    </div>
                                )}
                            </div>
                        )}
                    </CardBody>
                </Card>
            </div>

            {/* Quick Actions */}
            {connectionStatus.percentage > 0 && (
                <Card className="mt-8">
                    <CardHeader>
                        <p className="text-lg font-semibold">Quick Actions</p>
                    </CardHeader>
                    <CardBody>
                        <div className="flex flex-wrap gap-4">
                            <Button 
                                as={Link} 
                                href="/onboard"
                                color="primary" 
                                variant="flat"
                            >
                                🔄 Re-run Onboarding
                            </Button>
                            {cardano.isConnected && midnight.isConnected && (
                                <Button 
                                    color="success" 
                                    variant="flat"
                                >
                                    🎉 Both Wallets Ready!
                                </Button>
                            )}
                            <Button 
                                color="warning" 
                                variant="light"
                                onPress={() => {
                                    disconnectCardanoWallet();
                                    disconnectMidnightWallet();
                                }}
                            >
                                🔌 Disconnect All Wallets
                            </Button>
                        </div>
                    </CardBody>
                </Card>
            )}

            {/* Wallet Selection Modals */}
            <WalletsModal
                isOpen={isCardanoModalOpen}
                onOpenChange={setIsCardanoModalOpen}
                wallets={getAvailableCardanoWallets()}
                handleWalletSelect={handleCardanoWalletSelect}
            />

            <WalletsModal
                isOpen={isMidnightModalOpen}
                onOpenChange={setIsMidnightModalOpen}
                wallets={getAvailableMidnightWallets()}
                handleWalletSelect={handleMidnightWalletSelect}
            />
        </div>
    );
}