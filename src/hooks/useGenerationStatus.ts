import { GenerationStatusData } from '@/contexts/WalletContext';
import { logger } from '@/lib/logger';
import { useCallback, useEffect, useState } from 'react';

interface UseGenerationStatusReturn {
    data: GenerationStatusData | null;
    isLoading: boolean;
    error: string | null;
    refetch: () => void;
}

/**
 * Hook to fetch generation status from the Midnight indexer.
 * Works in parallel with the Blockfrost-based registration UTXO check.
 *
 * @param rewardAddress - The Cardano reward address (bech32 format: stake_test1... or stake1...)
 */
export function useGenerationStatus(rewardAddress: string | null): UseGenerationStatusReturn {
    const [data, setData] = useState<GenerationStatusData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchGenerationStatus = useCallback(async () => {
        if (!rewardAddress) {
            logger.log('[Indexer:GenerationStatus]', '⏸️ No reward address provided, skipping fetch');
            return;
        }

        setIsLoading(true);
        setError(null);

        logger.log('[Indexer:GenerationStatus]', '🔍 Fetching generation status...', {
            rewardAddress: rewardAddress,
        });

        try {
            // Reward address is already in bech32 format (stake_test1... or stake1...)
            // URL encode it to handle special characters
            const response = await fetch(`/api/dust/generation-status/${encodeURIComponent(rewardAddress)}`);

            if (!response.ok) {
                if (response.status === 404) {
                    // User not registered - this is expected for new users
                    logger.log('[Indexer:GenerationStatus]', '📭 Reward address not found in indexer (user not registered)');
                    setData(null);
                    return;
                }
                const errorBody = await response.json().catch(() => ({}));
                logger.error('[Indexer:GenerationStatus]', '❌ HTTP Error:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorBody,
                });
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            logger.log('[Indexer:GenerationStatus]', '✅ Response received:', result);

            if (result.success && result.data && result.data.length > 0) {
                const statusData = result.data[0];
                logger.log('[Indexer:GenerationStatus]', '📊 Generation status found:', {
                    cardanoRewardAddress: statusData.cardanoRewardAddress,
                    dustAddress: statusData.dustAddress,
                    registered: statusData.registered,
                    nightBalance: statusData.nightBalance,
                    generationRate: statusData.generationRate,
                    currentCapacity: statusData.currentCapacity,
                });
                setData(statusData);
            } else {
                logger.log('[Indexer:GenerationStatus]', '📭 No generation status data in response');
                setData(null);
            }
        } catch (err) {
            logger.error('[Indexer:GenerationStatus]', '❌ Failed to fetch generation status:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch generation status');
            setData(null);
        } finally {
            setIsLoading(false);
        }
    }, [rewardAddress]);

    const refetch = useCallback(() => {
        if (rewardAddress) {
            logger.log('[Indexer:GenerationStatus]', '🔄 Manual refetch triggered');
            fetchGenerationStatus();
        }
    }, [rewardAddress, fetchGenerationStatus]);

    useEffect(() => {
        if (rewardAddress) {
            logger.log('[Indexer:GenerationStatus]', '🚀 Reward address changed, fetching status...', { rewardAddress });
            fetchGenerationStatus();
        } else {
            logger.log('[Indexer:GenerationStatus]', '⏸️ No reward address, clearing state');
            setData(null);
            setError(null);
            setIsLoading(false);
        }
    }, [rewardAddress, fetchGenerationStatus]);

    return {
        data,
        isLoading,
        error,
        refetch,
    };
}
