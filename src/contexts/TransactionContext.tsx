'use client';
import { logger } from '@/lib/logger';

import { LucidEvolution } from '@lucid-evolution/lucid';
import React, { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';

// Transaction states
export type TransactionState = 'idle' | 'preparing' | 'signing' | 'submitting' | 'confirming' | 'success' | 'error';

// Transaction executor function type
export type TransactionExecutor<T = Record<string, unknown>> = (params: T, onProgress?: (step: string, progress: number) => void) => Promise<string>; // Returns transaction hash

// Transaction context type
interface TransactionContextType {
    // State
    transactionState: TransactionState;
    transactionProgress: number;
    txHash: string | null;
    transactionError: string | null;
    isExecuting: boolean;
    currentTransactionId: string | null;

    // Methods
    executeTransaction: <T>(transactionId: string, executor: TransactionExecutor<T>, params: T, lucid?: LucidEvolution) => Promise<TransactionState>;
    pollTransactionConfirmation: (lucid: LucidEvolution, txHash: string) => Promise<void>;
    setError: (error: string) => void;
    resetTransaction: () => void;
    setProgress: (progress: number) => void;
    setState: (state: TransactionState) => void;
    // Helper methods for transaction ID management
    isCurrentTransaction: (transactionId: string) => boolean;
    isAnyTransactionRunning: () => boolean;
}

// Create context
const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

// Provider component
export const TransactionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [transactionState, setTransactionState] = useState<TransactionState>('idle');
    const [transactionProgress, setTransactionProgress] = useState(0);
    const [txHash, setTxHash] = useState<string | null>(null);
    const [transactionError, setTransactionError] = useState<string | null>(null);
    const [currentTransactionId, setCurrentTransactionId] = useState<string | null>(null);

    const isExecuting = transactionState !== 'idle' && transactionState !== 'success' && transactionState !== 'error';

    // Poll for transaction confirmation using dual strategy from SetupActions
    const pollTransactionConfirmation = useCallback(async (lucid: LucidEvolution, txHash: string): Promise<void> => {
        logger.debug('[Transaction]', 'Starting transaction confirmation polling', { txHash });
        const maxAttempts = 60; // 15 minutes max (15s intervals)
        let attempts = 0;

        setTransactionState('confirming');

        return new Promise((resolve, reject) => {
            const pollInterval = setInterval(async () => {
                try {
                    attempts++;
                    const progress = 60 + (attempts / maxAttempts) * 40; // 60% to 100%
                    setTransactionProgress(progress);

                    // Strategy 1: Try awaitTx but don't rely on it alone
                    try {
                        const txInfo = await lucid.awaitTx(txHash, 3000);
                        if (txInfo) {
                            logger.debug('[Transaction]', 'Transaction confirmed', { txHash });

                            clearInterval(pollInterval);
                            setTransactionProgress(100);
                            setTransactionState('success');
                            resolve();
                            return;
                        }
                    } catch {
                        // Silently continue polling
                    }

                    // Continue polling if neither confirmation method succeeded
                    if (attempts >= maxAttempts) {
                        logger.warn('[Transaction]', 'Transaction confirmation timeout', { txHash, attempts: maxAttempts });
                        clearInterval(pollInterval);
                        setTransactionError('Transaction confirmation timeout. UTxOs not detected after 15 minutes.');
                        setTransactionState('error');
                        reject(new Error('Transaction confirmation timeout. UTxOs not detected after 15 minutes.'));
                    }
                } catch (err) {
                    logger.error('[Transaction]', 'Error during polling', err);
                    if (attempts >= maxAttempts) {
                        clearInterval(pollInterval);
                        setTransactionError('Polling error occurred during confirmation.');
                        setTransactionState('error');
                        reject(new Error('Polling error occurred during confirmation.'));
                    }
                }
            }, 15000); // Check every 15 seconds
        });
    }, []);

    const executeTransaction = useCallback(
        async <T,>(transactionId: string, executor: TransactionExecutor<T>, params: T, lucid?: LucidEvolution): Promise<TransactionState> => {
            try {
                // Reset state and set current transaction ID
                setTransactionState('preparing');
                setTransactionProgress(0);
                setTxHash(null);
                setTransactionError(null);
                setCurrentTransactionId(transactionId);

                logger.debug('[Transaction]', 'Starting transaction execution', { transactionId });

                // Execute the transaction with progress callback
                const resultTxHash = await executor(params, (step: string, progress: number) => {
                    logger.debug('[Transaction]', 'Transaction progress', { step, progress });
                    setTransactionProgress(progress);

                    // Update state based on step
                    if (step.toLowerCase().includes('sign')) {
                        setTransactionState('signing');
                    } else if (step.toLowerCase().includes('submit')) {
                        setTransactionState('submitting');
                    } else if (step.toLowerCase().includes('confirm')) {
                        setTransactionState('confirming');
                    }
                });

                // Set transaction hash and start confirmation polling
                setTxHash(resultTxHash);
                logger.debug('[Transaction]', 'Transaction submitted', { txHash: resultTxHash });

                // Use the existing pollTransactionConfirmation method if lucid is provided
                if (lucid) {
                    await pollTransactionConfirmation(lucid, resultTxHash);
                } else {
                    // Fallback: set success immediately if no lucid instance
                    setTransactionState('success');
                    setTransactionProgress(100);
                }

                logger.debug('[Transaction]', 'Transaction completed', { txHash: resultTxHash });
                return 'success';
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Transaction failed';
                logger.error('[Transaction]', 'Transaction failed', { error: errorMessage, transactionId });
                setTransactionError(errorMessage);
                setTransactionState('error');
                // Propagate error so callers (e.g., Onboard) can handle it
                throw error;
            }
        },
        [pollTransactionConfirmation]
    );

    const setError = useCallback((error: string) => {
        setTransactionError(error);
        setTransactionState('error');
    }, []);

    const resetTransaction = useCallback(() => {
        logger.debug('[Transaction]', 'Resetting transaction state');
        setTransactionState('idle');
        setTransactionProgress(0);
        setTxHash(null);
        setTransactionError(null);
        setCurrentTransactionId(null);
    }, []);

    const setProgress = useCallback((progress: number) => {
        setTransactionProgress(progress);
    }, []);

    const setState = useCallback((state: TransactionState) => {
        setTransactionState(state);
    }, []);

    // Helper methods for transaction ID management
    const isCurrentTransaction = useCallback(
        (transactionId: string) => {
            return currentTransactionId === transactionId;
        },
        [currentTransactionId]
    );

    const isAnyTransactionRunning = useCallback(() => {
        return isExecuting;
    }, [isExecuting]);

    const contextValue: TransactionContextType = useMemo(
        () => ({
            // State
            transactionState,
            transactionProgress,
            txHash,
            transactionError,
            isExecuting,
            currentTransactionId,

            // Methods
            executeTransaction,
            pollTransactionConfirmation,
            setError,
            resetTransaction,
            setProgress,
            setState,
            isCurrentTransaction,
            isAnyTransactionRunning,
        }),
        [
            transactionState,
            transactionProgress,
            txHash,
            transactionError,
            isExecuting,
            currentTransactionId,
            executeTransaction,
            pollTransactionConfirmation,
            setError,
            resetTransaction,
            setProgress,
            setState,
            isCurrentTransaction,
            isAnyTransactionRunning,
        ]
    );

    return <TransactionContext.Provider value={contextValue}>{children}</TransactionContext.Provider>;
};

// Custom hook to use the context
export const useTransaction = () => {
    const context = useContext(TransactionContext);
    if (context === undefined) {
        throw new Error('useTransaction must be used within a TransactionProvider');
    }
    return context;
};

// Export types for external use
export type { TransactionContextType };
