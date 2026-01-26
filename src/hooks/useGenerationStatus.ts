import { INDEXER_ENDPOINT } from '@/config/network';
import { GenerationStatusData } from '@/contexts/WalletContext';
import { logger } from '@/lib/logger';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface UseGenerationStatusReturn {
  data: GenerationStatusData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

const buildGenerationStatusUrl = () => {
  if (!INDEXER_ENDPOINT) throw "Please, configure an Indexer Endpoint."
  else { return INDEXER_ENDPOINT };
}

export function useGenerationStatus(rewardAddress: string | null): UseGenerationStatusReturn {
  const [data, setData] = useState<GenerationStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0); // bump to refetch

  const url = useMemo(() => {
    return rewardAddress ? buildGenerationStatusUrl() : null;
  }, [rewardAddress]);

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
            query: `
              {
                dustGenerationStatus(
                  cardanoRewardAddresses: [
                    "${rewardAddress}"
                  ]
                ) {
                  cardanoRewardAddress
                  dustAddress
                  generationRate
                  maxCapacity
                  currentCapacity
                  registered
                }
              }
            `,
          }),
        });

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
        const statusData = Array.isArray(result?.data.dustGenerationStatus) ? result.data.dustGenerationStatus[0] : null;
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