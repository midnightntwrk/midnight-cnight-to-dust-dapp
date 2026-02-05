import { useRuntimeConfig } from '@/contexts/RuntimeConfigContext';
import { GenerationStatusData } from '@/contexts/WalletContext';
import { logger } from '@/lib/logger';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface UseGenerationStatusReturn {
  data: GenerationStatusData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

const DUST_GENERATION_STATUS_QUERY = `
  query GetDustGenerationStatus($cardanoRewardAddresses: [String!]!) {
    dustGenerationStatus(cardanoRewardAddresses: $cardanoRewardAddresses) {
      cardanoRewardAddress
      dustAddress
      registered
      nightBalance
      generationRate
      currentCapacity
    }
  }
`;

export function useGenerationStatus(rewardAddress: string | null): UseGenerationStatusReturn {
  const { config } = useRuntimeConfig();
  const [data, setData] = useState<GenerationStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0); // bump to refetch

  const url = useMemo(() => {
    if (!rewardAddress) return null;
    if (!config.INDEXER_ENDPOINT) {
      logger.error('[Indexer:GenerationStatus]', 'INDEXER_ENDPOINT not configured');
      return null;
    }
    return config.INDEXER_ENDPOINT;
  }, [rewardAddress, config.INDEXER_ENDPOINT]);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!url) {
      setData(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();

    (async () => {
      setIsLoading(true);
      setError(null);

      try {
        logger.debug('[Indexer:GenerationStatus]', 'Fetching status', { rewardAddress });

        const response = await fetch(url, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: DUST_GENERATION_STATUS_QUERY,
            variables: {
              cardanoRewardAddresses: [rewardAddress],
            },
          }),
        });
        logger.info('HEREEEEEEEE:', response);
        if (!response.ok) {
          if (response.status === 404) {
            setData(null);
            return;
          }
          let errorBody: unknown = {};
          try {
            errorBody = await response.json();
          } catch {}
          logger.error('[Indexer:GenerationStatus]', 'HTTP error', {
            status: response.status,
            statusText: response.statusText,
            error: errorBody,
          });
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        logger.info('[Indexer:GenerationStatus]', 'Raw response:', JSON.stringify(result));
        const statusData = Array.isArray(result?.data?.dustGenerationStatus)
          ? result.data.dustGenerationStatus[0]
          : null;
        logger.info('[Indexer:GenerationStatus]', 'Parsed statusData:', statusData);
        setData(statusData);
      } catch (err) {
        if (controller.signal.aborted) return;
        logger.error('[Indexer:GenerationStatus]', 'Failed to fetch generation status', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch generation status');
        setData(null);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    })();

    return () => controller.abort();
  }, [url, nonce, rewardAddress]);

  return { data, isLoading, error, refetch };
}
