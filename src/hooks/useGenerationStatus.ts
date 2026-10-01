import { GenerationStatusData } from '@/contexts/WalletContext';
import { logger } from '@/lib/logger';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface UseGenerationStatusReturn {
  data: GenerationStatusData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Fetches DUST generation status for a Cardano reward address.
 *
 * Goes through the server route /api/dust/generation-status/[key], which queries the
 * indexer and adds its Blockfrost project token server-side. The browser never calls
 * the indexer directly, so the token never reaches the client and the CSP needs only
 * connect-src 'self'.
 */
export function useGenerationStatus(rewardAddress: string | null): UseGenerationStatusReturn {
  const [data, setData] = useState<GenerationStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0); // bump to refetch

  const url = useMemo(
    () => (rewardAddress ? `/api/dust/generation-status/${encodeURIComponent(rewardAddress)}` : null),
    [rewardAddress]
  );

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
          method: 'GET',
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
          },
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
        logger.info('[Indexer:GenerationStatus]', 'Raw response:', JSON.stringify(result));
        const statusData = Array.isArray(result?.data) ? (result.data[0] ?? null) : null;
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
