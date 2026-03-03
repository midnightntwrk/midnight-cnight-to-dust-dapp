import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { useGenerationStatus } from '../useGenerationStatus';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock RuntimeConfigContext
const mockGetIndexerEndpoint = vi.fn(() => 'https://indexer.preview.midnight.network/api/v3/graphql');

vi.mock('@/contexts/RuntimeConfigContext', () => ({
  useRuntimeConfig: () => ({
    getIndexerEndpoint: mockGetIndexerEndpoint,
    isLoading: false,
  }),
}));

describe('useGenerationStatus', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    mockGetIndexerEndpoint.mockReturnValue('https://indexer.preview.midnight.network/api/v3/graphql');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('should return null data when rewardAddress is null', () => {
    const { result } = renderHook(() => useGenerationStatus(null));
    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should fetch data when rewardAddress is provided', async () => {
    const mockData = {
      data: {
        dustGenerationStatus: [
          {
            cardanoRewardAddress: 'stake_test1abc',
            dustAddress: 'mn_dust_addr_test1xyz',
            registered: true,
            nightBalance: '1000',
            generationRate: '500000000000000',
            currentCapacity: '2000000000000000',
            maxCapacity: '5000000000000000',
          },
        ],
      },
    };

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { result } = renderHook(() => useGenerationStatus('stake_test1abc'));

    await waitFor(() => {
      expect(result.current.data).not.toBeNull();
    });

    expect(result.current.data!.registered).toBe(true);
    expect(result.current.data!.cardanoRewardAddress).toBe('stake_test1abc');
  });

  it('should make POST request with correct GraphQL query', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { dustGenerationStatus: [] } }), { status: 200 })
    );

    renderHook(() => useGenerationStatus('stake_test1abc'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    const [url, options] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe('https://indexer.preview.midnight.network/api/v3/graphql');
    expect(options?.method).toBe('POST');

    const body = JSON.parse(options?.body as string);
    expect(body.query).toContain('dustGenerationStatus');
    expect(body.variables.cardanoRewardAddresses).toEqual(['stake_test1abc']);
  });

  it('should set error on HTTP error', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Server Error' }), {
        status: 500,
        statusText: 'Internal Server Error',
      })
    );

    const { result } = renderHook(() => useGenerationStatus('stake_test1abc'));

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error).toContain('500');
    expect(result.current.data).toBeNull();
  });

  it('should set null data on 404 without error', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(null, { status: 404, statusText: 'Not Found' })
    );

    const { result } = renderHook(() => useGenerationStatus('stake_test1abc'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should handle network errors', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useGenerationStatus('stake_test1abc'));

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.data).toBeNull();
  });

  it('should refetch when refetch is called', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ data: { dustGenerationStatus: [] } }), { status: 200 })
    );

    const { result } = renderHook(() => useGenerationStatus('stake_test1abc'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  it('should abort fetch on unmount', async () => {
    let abortSignal: AbortSignal | undefined;

    vi.mocked(fetch).mockImplementation(async (_url, options) => {
      abortSignal = options?.signal as AbortSignal;
      // Delay so the component unmounts before fetch completes
      return new Promise((resolve) =>
        setTimeout(
          () =>
            resolve(
              new Response(JSON.stringify({ data: { dustGenerationStatus: [] } }), { status: 200 })
            ),
          1000
        )
      );
    });

    const { unmount } = renderHook(() => useGenerationStatus('stake_test1abc'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    unmount();

    expect(abortSignal?.aborted).toBe(true);
  });

  it('should reset data when rewardAddress becomes null', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            dustGenerationStatus: [
              {
                cardanoRewardAddress: 'stake_test1abc',
                dustAddress: null,
                registered: true,
                nightBalance: '0',
                generationRate: '0',
                currentCapacity: '0',
              },
            ],
          },
        }),
        { status: 200 }
      )
    );

    const { result, rerender } = renderHook(
      ({ address }) => useGenerationStatus(address),
      { initialProps: { address: 'stake_test1abc' as string | null } }
    );

    await waitFor(() => {
      expect(result.current.data).not.toBeNull();
    });

    rerender({ address: null });

    expect(result.current.data).toBeNull();
  });
});
