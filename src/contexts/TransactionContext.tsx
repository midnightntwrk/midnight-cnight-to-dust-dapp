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

    // Poll for transaction confirmation using exponential backoff
    const pollTransactionConfirmation = useCallback(async (lucid: LucidEvolution, txHash: string): Promise<void> => {
        logger.debug('[Transaction]', 'Starting transaction confirmation polling with exponential backoff', { txHash });

        // ✅ OPTIMIZATION: Exponential backoff for transaction confirmation
        const MAX_DURATION_MS = 900000; // 15 minutes total (same as before)
        const INITIAL_INTERVAL_MS = 10000; // Start with 10 seconds
        const MAX_INTERVAL_MS = 30000; // Cap at 30 seconds
        const BACKOFF_MULTIPLIER = 1.3; // Slower growth than UTXO polling

        setTransactionState('confirming');

        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            let attempt = 0;

            const poll = async () => {
                try {
                    attempt++;
                    const elapsed = Date.now() - startTime;
                    const progress = 60 + Math.min((elapsed / MAX_DURATION_MS) * 40, 40); // 60% to 100%
                    setTransactionProgress(progress);

                    logger.debug('[Transaction]', `Polling attempt ${attempt}`, { txHash, elapsedMs: elapsed });

                    // Try to confirm the transaction
                    try {
                        const txInfo = await lucid.awaitTx(txHash, 3000);
                        if (txInfo) {
                            const totalSeconds = (elapsed / 1000).toFixed(1);
                            logger.debug('[Transaction]', `Transaction confirmed after ${attempt} attempts in ${totalSeconds}s`, { txHash });

                            setTransactionProgress(100);
                            setTransactionState('success');
                            resolve();
                            return;
                        }
                    } catch {
                        // Silently continue polling
                    }

                    // Check if timeout reached
                    const timeRemaining = MAX_DURATION_MS - elapsed;
                    if (timeRemaining <= 0) {
                        logger.warn('[Transaction]', 'Transaction confirmation timeout', { txHash, attempts: attempt });
                        setTransactionError('Transaction confirmation timeout. UTxOs not detected after 15 minutes.');
                        setTransactionState('error');
                        reject(new Error('Transaction confirmation timeout. UTxOs not detected after 15 minutes.'));
                        return;
                    }

                    // Calculate next backoff interval with exponential growth
                    // Formula: min(INITIAL * (MULTIPLIER ^ (attempt - 1)), MAX)
                    // Results: 10s → 13s → 16.9s → 22s → 28.6s → 30s → 30s...
                    const nextInterval = Math.min(
                        INITIAL_INTERVAL_MS * Math.pow(BACKOFF_MULTIPLIER, attempt - 1),
                        MAX_INTERVAL_MS
                    );

                    // Schedule next poll with calculated backoff
                    const waitTime = Math.min(nextInterval, timeRemaining);
                    logger.debug('[Transaction]', `Next poll in ${(waitTime / 1000).toFixed(1)}s`);
                    setTimeout(poll, waitTime);

                } catch (err) {
                    logger.error('[Transaction]', 'Error during polling', err);
                    setTransactionError('Polling error occurred during confirmation.');
                    setTransactionState('error');
                    reject(new Error('Polling error occurred during confirmation.'));
                }
            };

            // Start first poll immediately
            poll();
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
