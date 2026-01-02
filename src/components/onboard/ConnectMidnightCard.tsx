'use client';

import CheckIcon from '@/assets/icons/check.svg';
import InfoIcon from '@/assets/icons/info.svg';
import MidnightLogo from '@/assets/midnight.svg';
import { Button, Card, CardBody, Input } from '@heroui/react';
import Image from 'next/image';
import { useState } from 'react';
import { validateDustAddress, getMidnightNetworkId } from '@/lib/utils';

interface ConnectMidnightCardProps {
    // Connection state
    isConnected: boolean;
    onConnect: () => void;
    onDisconnect: () => void;
    isLoading?: boolean;
    error?: string | null;

    // Wallet info (when connected)
    walletName?: string;
    balance?: string;
    address?: string;

    // Manual address input
    onManualAddressSubmit?: (address: string) => void;
}

export default function ConnectMidnightCard({
    isConnected,
    onConnect,
    onDisconnect,
    isLoading = false,
    error,
    walletName,
    address,
    onManualAddressSubmit,
}: ConnectMidnightCardProps) {
    const [manualAddress, setManualAddress] = useState('');
    const [isValidAddress, setIsValidAddress] = useState(true);

    const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setManualAddress(value);

        // Validate as Dust address if not empty
        if (!value.trim()) {
            setIsValidAddress(true); // Empty is valid (not an error state)
        } else {
            const networkId = getMidnightNetworkId();
            setIsValidAddress(validateDustAddress(value, networkId));
        }
    };

    const handleManualSubmit = () => {
        if (manualAddress.trim() && isValidAddress && onManualAddressSubmit) {
            onManualAddressSubmit(manualAddress.trim());
        }
    };

    const formatAddress = (addr: string) => {
        if (!addr) return '';
        return `${addr.slice(0, 9)}...${addr.slice(-9)}`;
    };

    return (
        <div className="flex justify-center mb-8">
            <Card className="bg-[#70707040] border-none max-w-2xl w-full relative overflow-hidden">
                <CardBody className="p-6 md:p-8">
                    {/* Midnight Logo - Background */}
                    <div className="absolute top-8 right-8">
                        <Image src={MidnightLogo} alt="Midnight" width={90} height={90} />
                    </div>

                    {/* Content */}
                    <div className="relative z-10">
                        {!isConnected ? (
                            /* Disconnected State */
                            <div className="space-y-6">
                                {/* Title */}
                                <h2 className="text-xl md:text-2xl font-bold text-white">Connect your Midnight Wallet</h2>

                                {/* Connect Button */}
                                <Button
                                    onPress={onConnect}
                                    isLoading={isLoading}
                                    className="bg-brand-primary hover:bg-brand-primary-hover text-white font-medium w-full py-3 text-sm md:text-base"
                                    size="lg"
                                    radius="md"
                                >
                                    {isLoading ? 'CONNECTING...' : 'CONNECT MIDNIGHT WALLET'}
                                </Button>

                                {/* OR Divider */}
                                {onManualAddressSubmit && (
                                    <div className="flex items-center gap-4 my-6">
                                        <div className="flex-1 h-px bg-gray-600"></div>
                                        <span className="text-gray-400 text-sm">OR</span>
                                        <div className="flex-1 h-px bg-gray-600"></div>
                                    </div>
                                )}

                                {/* Manual Address Input */}
                                {onManualAddressSubmit && (
                                    <div className="space-y-4">
                                        <p className="text-[#FFFFFF50] text-sm">Add a DUST address manually</p>
                                        <div className="space-y-2">
                                            <div className="flex gap-3">
                                                <Input
                                                    placeholder="Enter Midnight DUST address..."
                                                    value={manualAddress}
                                                    onChange={handleAddressChange}
                                                    className="flex-1"
                                                    size="lg"
                                                    classNames={{
                                                        input: 'bg-transparent text-white placeholder:text-gray-500',
                                                        inputWrapper: `bg-white/10 border border-white/20 hover:border-white/40 ${!isValidAddress ? '!border-red-500' : ''}`,
                                                    }}
                                                    isInvalid={!isValidAddress}
                                                />
                                                <Button
                                                    onPress={handleManualSubmit}
                                                    isDisabled={!manualAddress.trim() || !isValidAddress}
                                                    className="bg-gray-700 hover:bg-gray-600 text-white font-medium px-6 disabled:bg-gray-800 disabled:text-gray-500"
                                                    size="lg"
                                                >
                                                    Add
                                                </Button>
                                            </div>
                                            {!isValidAddress && manualAddress.trim() && <p className="text-red-400 text-xs ml-1">Invalid Midnight Dust address format</p>}
                                        </div>
                                    </div>
                                )}

                                {/* Error Message */}
                                {error && (
                                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                        <p className="text-red-400 text-sm">❌ {error}</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Connected State */
                            <div className="space-y-4">
                                {/* Header with Info Icon */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-xl md:text-2xl font-bold text-white">Destination Address Midnight</h2>
                                        <Image src={InfoIcon} alt="info" width={16} height={16} />
                                    </div>
                                </div>

                                {/* Balance Info */}
                                <div className="text-gray-400 text-sm">
                                    Balance: <span className="text-white font-medium">*** DUST (Shielded)</span>
                                </div>

                                {/* Wallet Info */}
                                <div className="text-gray-400 text-sm">
                                    Wallet: <span className="text-white font-medium">{walletName}</span>
                                </div>

                                {/* Address with Check and Copy Icons */}
                                <div className="flex items-center gap-2 mt-3">
                                    <Image src={CheckIcon} alt="check" width={16} height={16} />
                                    <span className="text-white text-sm font-mono flex-1">{formatAddress(address || '')}</span>
                                    <Button
                                        onPress={onDisconnect}
                                        size="sm"
                                        className="bg-transparent border border-gray-600 text-gray-300 hover:bg-gray-700 px-4 py-1 text-xs"
                                        radius="md"
                                    >
                                        DISCONNECT
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </CardBody>
            </Card>
        </div>
    );
}
