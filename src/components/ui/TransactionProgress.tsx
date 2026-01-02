'use client';

import React from 'react';
import { Progress, Button } from '@heroui/react';
import { useTransaction } from '@/contexts/TransactionContext';
import { getCardanoScanUrl } from '@/config/network';

export type TransactionState = 'idle' | 'preparing' | 'signing' | 'submitting' | 'confirming' | 'success' | 'error';

export interface TransactionLabels {
    title?: string;
    preparing?: string;
    signing?: string;
    submitting?: string;
    confirming?: string;
    success?: string;
    error?: string;
    signHelper?: string;
    successDescription?: string;
}

// Default labels that can be overridden
const defaultLabels: Required<TransactionLabels> = {
    title: 'Transaction',
    preparing: 'Preparing transaction...',
    signing: 'Please sign the transaction in your wallet...',
    submitting: 'Submitting transaction to blockchain...',
    confirming: 'Waiting for transaction confirmation...',
    success: 'Transaction completed successfully!',
    error: 'Transaction failed',
    signHelper: '💡 Please check your wallet and approve the transaction to continue.',
    successDescription: 'Your transaction has been completed successfully.',
};

interface TransactionProgressProps {
    labels?: TransactionLabels;
}

export default function TransactionProgress({ labels }: TransactionProgressProps) {
    // Get transaction state from context
    const { transactionState, transactionProgress: progress, txHash, transactionError: error, resetTransaction } = useTransaction();

    // Merge provided labels with defaults
    const finalLabels = { ...defaultLabels, ...labels };

    const getStatusMessage = () => {
        switch (transactionState) {
            case 'preparing':
                return finalLabels.preparing;
            case 'signing':
                return finalLabels.signing;
            case 'submitting':
                return finalLabels.submitting;
            case 'confirming':
                return finalLabels.confirming;
            case 'success':
                return finalLabels.success;
            case 'error':
                return finalLabels.error;
            default:
                return '';
        }
    };

    const getStatusColor = () => {
        switch (transactionState) {
            case 'preparing':
            case 'signing':
            case 'submitting':
            case 'confirming':
                return 'primary';
            case 'success':
                return 'success';
            case 'error':
                return 'danger';
            default:
                return 'default';
        }
    };

    const isActive = transactionState !== 'idle' && transactionState !== 'success';

    if (transactionState === 'idle') return null;

    return (
        <div className="bg-white/5 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">{finalLabels.title}</h3>

            {/* Error State */}
            {error && transactionState === 'error' && (
                <div className="mb-4 p-4 bg-red-500/20 border border-red-400 rounded-lg">
                    <h4 className="font-semibold text-red-200 mb-2">{finalLabels.error}</h4>
                    <p className="text-red-300 text-sm font-mono">{error}</p>
                    <Button size="sm" color="danger" variant="flat" onPress={resetTransaction} className="mt-3">
                        Close
                    </Button>
                </div>
            )}

            {/* Success State with Transaction Hash */}
            {txHash && transactionState === 'success' && (
                <div className="mb-4 p-4 bg-green-500/20 border border-green-400 rounded-lg">
                    <h4 className="font-semibold text-green-200 mb-2">{finalLabels.success}</h4>
                    {finalLabels.successDescription && <p className="text-green-300 text-sm mb-3">{finalLabels.successDescription}</p>}
                    <div className="mb-3">
                        <span className="block mb-1 text-green-300 text-sm">Transaction Hash:</span>
                        <span className="font-mono text-green-200 text-xs break-all">{txHash}</span>
                    </div>
                    <a href={getCardanoScanUrl('transaction', txHash)} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300 text-sm underline">
                        View on CardanoScan →
                    </a>
                </div>
            )}

            {/* Progress Bar and Status */}
            {isActive && (
                <div className="space-y-4">
                    <div className="flex items-start justify-between">
                        <p className="text-white font-medium">{getStatusMessage()}</p>
                        <span className="text-white/70 text-sm">{Math.round(progress)}%</span>
                    </div>

                    <Progress
                        value={progress}
                        color={getStatusColor()}
                        className="w-full"
                        classNames={{
                            track: 'bg-white/10',
                            indicator: 'transition-all duration-300',
                        }}
                    />

                    {/* Special message for signing */}
                    {transactionState === 'signing' && (
                        <div className="p-3 bg-blue-500/20 border border-blue-400 rounded-lg">
                            <p className="text-blue-200 text-sm">{finalLabels.signHelper}</p>
                        </div>
                    )}

                    {/* Transaction Hash during confirmation */}
                    {txHash && transactionState === 'confirming' && (
                        <div className="p-3 bg-yellow-500/20 border border-yellow-400 rounded-lg">
                            <p className="text-yellow-200 text-sm mb-2">Transaction submitted, waiting for confirmation...</p>
                            <div className="mb-2">
                                <span className="block mb-1 text-yellow-300 text-xs">Hash:</span>
                                <span className="font-mono text-yellow-200 text-xs break-all">{txHash}</span>
                            </div>
                            <a
                                href={getCardanoScanUrl('transaction', txHash)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-yellow-400 hover:text-yellow-300 text-xs underline"
                            >
                                View on CardanoScan →
                            </a>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
