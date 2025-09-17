import { useState, useEffect } from 'react';

interface GenerationStatusData {
  cardanoStakeKey: string;
  dustAddress: string | null;
  isRegistered: boolean;
  generationRate: string;
}

interface UseGenerationStatusReturn {
  data: GenerationStatusData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useGenerationStatus(cardanoAddress: string | null): UseGenerationStatusReturn {
  const [data, setData] = useState<GenerationStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGenerationStatus = async (address: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // For now, use hardcoded key since indexer is not ready
      // TODO: Replace with actual address when indexer is complete
      const keyToUse = "1234567890abcdef1234567890abcdef";

      const response = await fetch(`/api/dust/generation-status/${keyToUse}`);

      if (!response.ok) {
        if (response.status === 404) {
          // User not registered - this is expected for new users
          setData(null);
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      console.log("result", result);

      if (result.success && result.data && result.data.length > 0) {
        setData(result.data[0]);
      } else {
        setData(null);
      }
    } catch (err) {
      console.error('Failed to fetch generation status:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch generation status');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refetch = () => {
    if (cardanoAddress) {
      fetchGenerationStatus(cardanoAddress);
    }
  };

  useEffect(() => {
    if (cardanoAddress) {
      fetchGenerationStatus(cardanoAddress);
    } else {
      setData(null);
      setError(null);
      setIsLoading(false);
    }
  }, [cardanoAddress]);

  return {
    data,
    isLoading,
    error,
    refetch
  };
}