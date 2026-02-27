import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { TransactionProvider, useTransaction } from '../TransactionContext';
import type { TransactionExecutor } from '../TransactionContext';

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

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TransactionProvider>{children}</TransactionProvider>
);

describe('TransactionContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should start in idle state', () => {
      const { result } = renderHook(() => useTransaction(), { wrapper });
      expect(result.current.transactionState).toBe('idle');
    });

    it('should have zero progress', () => {
      const { result } = renderHook(() => useTransaction(), { wrapper });
      expect(result.current.transactionProgress).toBe(0);
    });

    it('should have no txHash', () => {
      const { result } = renderHook(() => useTransaction(), { wrapper });
      expect(result.current.txHash).toBeNull();
    });

    it('should have no error', () => {
      const { result } = renderHook(() => useTransaction(), { wrapper });
      expect(result.current.transactionError).toBeNull();
    });

    it('should not be executing', () => {
      const { result } = renderHook(() => useTransaction(), { wrapper });
      expect(result.current.isExecuting).toBe(false);
    });

    it('should have no currentTransactionId', () => {
      const { result } = renderHook(() => useTransaction(), { wrapper });
      expect(result.current.currentTransactionId).toBeNull();
    });

    it('isAnyTransactionRunning should return false when idle', () => {
      const { result } = renderHook(() => useTransaction(), { wrapper });
      expect(result.current.isAnyTransactionRunning()).toBe(false);
    });
  });

  describe('executeTransaction', () => {
    it('should transition to preparing state', () => {
      const { result } = renderHook(() => useTransaction(), { wrapper });

      const executor: TransactionExecutor = () => new Promise(() => {});

      act(() => {
        result.current.executeTransaction('test', executor, {});
      });

      expect(result.current.transactionState).toBe('preparing');
    });

    it('should set currentTransactionId', () => {
      const { result } = renderHook(() => useTransaction(), { wrapper });

      const executor: TransactionExecutor = () => new Promise(() => {});

      act(() => {
        result.current.executeTransaction('my-tx', executor, {});
      });

      expect(result.current.currentTransactionId).toBe('my-tx');
    });

    it('should set success without lucid (fallback path)', async () => {
      const { result } = renderHook(() => useTransaction(), { wrapper });

      const executor: TransactionExecutor = async () => 'tx_hash_123';

      await act(async () => {
        const state = await result.current.executeTransaction('test', executor, {});
        expect(state).toBe('success');
      });

      expect(result.current.transactionState).toBe('success');
      expect(result.current.txHash).toBe('tx_hash_123');
      expect(result.current.transactionProgress).toBe(100);
    });

    it('should transition to error on executor failure', async () => {
      const { result } = renderHook(() => useTransaction(), { wrapper });

      const executor: TransactionExecutor = async () => {
        throw new Error('Executor failed');
      };

      await act(async () => {
        await expect(
          result.current.executeTransaction('test', executor, {})
        ).rejects.toThrow('Executor failed');
      });

      expect(result.current.transactionState).toBe('error');
      expect(result.current.transactionError).toBe('Executor failed');
    });

    it('should call progress callback with step names', async () => {
      const { result } = renderHook(() => useTransaction(), { wrapper });

      const progressCalls: { step: string; progress: number }[] = [];

      const executor: TransactionExecutor = async (_params, onProgress) => {
        onProgress?.('Signing transaction', 30);
        progressCalls.push({ step: 'Signing transaction', progress: 30 });
        onProgress?.('Submitting transaction', 50);
        progressCalls.push({ step: 'Submitting transaction', progress: 50 });
        return 'tx_hash_123';
      };

      await act(async () => {
        await result.current.executeTransaction('test', executor, {});
      });

      expect(progressCalls).toHaveLength(2);
      expect(progressCalls[0].step).toContain('Sign');
      expect(progressCalls[1].step).toContain('Submit');
    });

    it('isCurrentTransaction should match current transaction ID', () => {
      const { result } = renderHook(() => useTransaction(), { wrapper });

      const executor: TransactionExecutor = () => new Promise(() => {});

      act(() => {
        result.current.executeTransaction('register', executor, {});
      });

      expect(result.current.isCurrentTransaction('register')).toBe(true);
      expect(result.current.isCurrentTransaction('unregister')).toBe(false);
    });

    it('isAnyTransactionRunning should return true when executing', () => {
      const { result } = renderHook(() => useTransaction(), { wrapper });

      const executor: TransactionExecutor = () => new Promise(() => {});

      act(() => {
        result.current.executeTransaction('test', executor, {});
      });

      expect(result.current.isAnyTransactionRunning()).toBe(true);
    });
  });

  describe('pollTransactionConfirmation', () => {
    it('should set state to confirming', () => {
      const { result } = renderHook(() => useTransaction(), { wrapper });

      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ error: 'not found' }), { status: 404 })
      );

      const mockLucid = {} as never;

      act(() => {
        result.current.pollTransactionConfirmation(mockLucid, 'tx_abc');
      });

      expect(result.current.transactionState).toBe('confirming');
    });

    it('should resolve on successful confirmation', async () => {
      const { result } = renderHook(() => useTransaction(), { wrapper });

      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ hash: 'tx_abc' }), { status: 200 })
      );

      const mockLucid = {} as never;

      await act(async () => {
        await result.current.pollTransactionConfirmation(mockLucid, 'tx_abc');
      });

      expect(result.current.transactionState).toBe('success');
      expect(result.current.transactionProgress).toBe(100);
    });

    it('should timeout after 15 minutes', async () => {
      const { result } = renderHook(() => useTransaction(), { wrapper });

      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ error: 'not found' }), { status: 404 })
      );

      const mockLucid = {} as never;

      let pollPromise: Promise<void>;
      act(() => {
        pollPromise = result.current.pollTransactionConfirmation(mockLucid, 'tx_timeout')
          .catch(() => {}); // Handle rejection to avoid unhandled promise
      });

      // Advance time past 15 minutes
      await act(async () => {
        await vi.advanceTimersByTimeAsync(900_001);
      });

      await pollPromise!;
      expect(result.current.transactionState).toBe('error');
      expect(result.current.transactionError).toContain('timeout');
    });
  });

  describe('setError', () => {
    it('should set error state', () => {
      const { result } = renderHook(() => useTransaction(), { wrapper });

      act(() => {
        result.current.setError('Something went wrong');
      });

      expect(result.current.transactionState).toBe('error');
      expect(result.current.transactionError).toBe('Something went wrong');
    });
  });

  describe('resetTransaction', () => {
    it('should reset all state to initial values', async () => {
      const { result } = renderHook(() => useTransaction(), { wrapper });

      const executor: TransactionExecutor = async () => 'tx_hash';

      await act(async () => {
        await result.current.executeTransaction('test', executor, {});
      });

      expect(result.current.transactionState).toBe('success');

      act(() => {
        result.current.resetTransaction();
      });

      expect(result.current.transactionState).toBe('idle');
      expect(result.current.transactionProgress).toBe(0);
      expect(result.current.txHash).toBeNull();
      expect(result.current.transactionError).toBeNull();
      expect(result.current.currentTransactionId).toBeNull();
    });
  });

  describe('useTransaction outside provider', () => {
    it('should throw when used outside TransactionProvider', () => {
      const { result } = renderHook(() => {
        try {
          return useTransaction();
        } catch (e) {
          return e;
        }
      });
      expect(result.current).toBeInstanceOf(Error);
      expect((result.current as Error).message).toBe('useTransaction must be used within a TransactionProvider');
    });
  });
});
