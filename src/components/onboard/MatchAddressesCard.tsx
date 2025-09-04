"use client";

import React from 'react';
import { Card, CardBody, Button } from "@heroui/react";
import Image from 'next/image';
import CopyIcon from '@/assets/icons/copy.svg';
import CheckIcon from '@/assets/icons/check.svg';
import InfoIcon from '@/assets/icons/info.svg';

interface MatchAddressesCardProps {
    // Cardano wallet info
    cardanoWalletName: string;
    cardanoBalance: string;
    cardanoAddress: string;
    onDisconnectCardano: () => void;
    
    // Midnight wallet info
    midnightWalletName: string;
    midnightAddress: string;
    onDisconnectMidnight: () => void;
    
    // Match action
    onMatch: () => void;
    isMatching?: boolean;
}

export default function MatchAddressesCard({
    cardanoWalletName,
    cardanoBalance,
    cardanoAddress,
    onDisconnectCardano,
    midnightWalletName,
    midnightAddress,
    onDisconnectMidnight,
    onMatch,
    isMatching = false
}: MatchAddressesCardProps) {

    const handleCopyCardanoAddress = () => {
        navigator.clipboard.writeText(cardanoAddress);
    };

    const handleCopyMidnightAddress = () => {
        navigator.clipboard.writeText(midnightAddress);
    };

    const formatAddress = (addr: string) => {
        if (!addr) return '';
        return `${addr.slice(0, 9)}...${addr.slice(-9)}`;
    };

    return (
        <div className="flex justify-center mb-8">
            <Card className="bg-[#70707040] border-none max-w-2xl w-full">
                <CardBody className="p-6 md:p-8">
                    {/* Header */}
                    <div className="mb-8">
                        <h2 className="text-xl md:text-2xl font-bold text-white">
                            Match addresses
                        </h2>
                    </div>

                    {/* Origin Address Cardano Section */}
                    <div className="mb-8 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h3 className="text-white font-medium">Origin Address Cardano</h3>
                                <Image src={InfoIcon} alt="info" width={16} height={16} />
                            </div>
                            <Button
                                onClick={onDisconnectCardano}
                                size="sm"
                                className="bg-transparent border border-gray-600 text-gray-300 hover:bg-gray-700 px-4 py-1 text-xs"
                                radius="md"
                            >
                                DISCONNECT
                            </Button>
                        </div>

                        <div className="text-gray-400 text-sm">
                            Balance: <span className="text-white font-medium">{cardanoBalance} NIGHT</span>
                        </div>

                        <div className="text-gray-400 text-sm">
                            Wallet: <span className="text-white font-medium">{cardanoWalletName}</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <Image src={CheckIcon} alt="check" width={16} height={16} />
                            <span className="text-white text-sm font-mono flex-1">
                                {formatAddress(cardanoAddress)}
                            </span>
                            <button 
                                onClick={handleCopyCardanoAddress}
                                className="hover:opacity-70 transition-opacity"
                            >
                                <Image src={CopyIcon} alt="copy" width={16} height={16} />
                            </button>
                        </div>
                    </div>

                    {/* Destination Address Midnight Section */}
                    <div className="mb-8 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h3 className="text-white font-medium">Destination Address Midnight</h3>
                                <Image src={InfoIcon} alt="info" width={16} height={16} />
                            </div>
                            <Button
                                onClick={onDisconnectMidnight}
                                size="sm"
                                className="bg-transparent border border-gray-600 text-gray-300 hover:bg-gray-700 px-4 py-1 text-xs"
                                radius="md"
                            >
                                DISCONNECT
                            </Button>
                        </div>

                        <div className="text-gray-400 text-sm">
                            Wallet: <span className="text-white font-medium">{midnightWalletName}</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <Image src={CheckIcon} alt="check" width={16} height={16} />
                            <span className="text-white text-sm font-mono flex-1">
                                {formatAddress(midnightAddress)}
                            </span>
                            <button 
                                onClick={handleCopyMidnightAddress}
                                className="hover:opacity-70 transition-opacity"
                            >
                                <Image src={CopyIcon} alt="copy" width={16} height={16} />
                            </button>
                        </div>
                    </div>

                    {/* Match Addresses Button */}
                    <Button
                        onClick={onMatch}
                        isLoading={isMatching}
                        className="bg-[#0000FE] hover:bg-blue-600 text-white font-medium w-full py-3 text-sm md:text-base"
                        size="lg"
                        radius="md"
                    >
                        {isMatching ? 'MATCHING...' : 'MATCH ADDRESSES'}
                    </Button>
                </CardBody>
            </Card>
        </div>
    );
}