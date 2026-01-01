'use client';

import React from 'react';
import { Card, CardBody, Button } from '@heroui/react';
import Image from 'next/image';
import CopyIcon from '@/assets/icons/copy.svg';
import CheckIcon from '@/assets/icons/check.svg';
import InfoIcon from '@/assets/icons/info.svg';
import { useTransaction } from '@/contexts/TransactionContext';
// import { useDustProtocol } from '@/contexts/DustProtocolContext';
import { hasMinimumBalance, MIN_ADA_FOR_REGISTRATION } from '@/config/transactionConstants';

interface MatchAddressesCardProps {
    // Cardano wallet info
    cardanoWalletName: string;
    cardanoBalanceNight: string;
    cardanoBalanceADA: string;
    cardanoAddress: string;
    onDisconnectCardano: () => void;

    // Midnight wallet info
    midnightWalletName: string;
    midnightAddress: string;
    onDisconnectMidnight: () => void;

    // Match action
    onMatch: () => void;
}

export default function MatchAddressesCard({
    cardanoWalletName,
    cardanoBalanceNight,
    cardanoBalanceADA,
    cardanoAddress,
    onDisconnectCardano,
    midnightWalletName,
    midnightAddress,
    onDisconnectMidnight,
    onMatch,
}: MatchAddressesCardProps) {
    // Transaction management
    const transaction = useTransaction();

    // Check if user has minimum balance
    const hasEnoughBalance = hasMinimumBalance(cardanoBalanceADA);

    const isMatching = transaction.isCurrentTransaction('register') && transaction.isAnyTransactionRunning();
    const disabled = 
        // Disable if insufficient balance
        !hasEnoughBalance ||
        // Disable during any transaction execution
        transaction.isAnyTransactionRunning() ||
        // Disable if registration already successfully completed
        (transaction.isCurrentTransaction('register') && transaction.transactionState === 'success');

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
                        <h2 className="text-xl md:text-2xl font-bold text-white">Match addresses</h2>
                    </div>

                    {/* Origin Address Cardano Section */}
                    <div className="mb-8 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h3 className="text-white font-medium">Origin Address Cardano</h3>
                                <Image src={InfoIcon} alt="info" width={16} height={16} />
                            </div>
                            <Button
                                onPress={onDisconnectCardano}
                                size="sm"
                                className="bg-transparent border border-gray-600 text-gray-300 hover:bg-gray-700 px-4 py-1 text-xs"
                                radius="md"
                            >
                                DISCONNECT
                            </Button>
                        </div>

                        <div className="text-gray-400 text-sm">
                            Balance: <span className="text-white font-medium">{cardanoBalanceNight} NIGHT</span>
                        </div>

                        <div className="text-gray-400 text-sm">
                            ADA Balance: <span className={`font-medium ${hasEnoughBalance ? 'text-white' : 'text-red-400'}`}>{cardanoBalanceADA} ADA</span>
                            {!hasEnoughBalance && (
                                <span className="text-red-400 ml-2 text-xs">
                                    (Min. {MIN_ADA_FOR_REGISTRATION} ADA required)
                                </span>
                            )}
                        </div>

                        <div className="text-gray-400 text-sm">
                            Wallet: <span className="text-white font-medium">{cardanoWalletName}</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <Image src={CheckIcon} alt="check" width={16} height={16} />
                            <span className="text-white text-sm font-mono flex-1">{formatAddress(cardanoAddress)}</span>
                            <button onClick={handleCopyCardanoAddress} className="hover:opacity-70 transition-opacity">
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
                                onPress={onDisconnectMidnight}
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
                            <span className="text-white text-sm font-mono flex-1">{formatAddress(midnightAddress)}</span>
                            <button onClick={handleCopyMidnightAddress} className="hover:opacity-70 transition-opacity">
                                <Image src={CopyIcon} alt="copy" width={16} height={16} />
                            </button>
                        </div>
                    </div>

                    {/* Insufficient Balance Warning */}
                    {!hasEnoughBalance && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
                            <p className="text-red-400 text-sm">
                                Insufficient ADA balance. You need at least {MIN_ADA_FOR_REGISTRATION} ADA to execute the registration transaction.
                            </p>
                        </div>
                    )}

                    {/* Match Addresses Button */}
                    <Button
                        onPress={onMatch}
                        isLoading={isMatching}
                        isDisabled={disabled || isMatching}
                        className="bg-brand-primary hover:bg-brand-primary-hover text-white font-medium w-full py-3 text-sm md:text-base disabled:bg-gray-600 disabled:text-gray-400"
                        size="lg"
                        radius="md"
                    >
                        {isMatching
                            ? 'MATCHING...'
                            : transaction.isCurrentTransaction('register') && transaction.transactionState === 'success'
                            ? 'REGISTRATION COMPLETED ✅'
                            : !hasEnoughBalance
                            ? `INSUFFICIENT BALANCE (Min. ${MIN_ADA_FOR_REGISTRATION} ADA)`
                            : 'MATCH ADDRESSES'
                            }
                    </Button>
                </CardBody>
            </Card>
        </div>
    );
}
