import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToast } from '../useToast';

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should start with an empty toasts array', () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.toasts).toEqual([]);
  });

  it('should add a toast with showToast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast({ message: 'Hello!', type: 'success' });
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].message).toBe('Hello!');
    expect(result.current.toasts[0].type).toBe('success');
  });

  it('should assign a unique ID to each toast', () => {
    const { result } = renderHook(() => useToast());

    let id: string;
    act(() => {
      id = result.current.showToast({ message: 'Test' });
    });

    expect(id!).toBeDefined();
    expect(typeof id!).toBe('string');
    expect(result.current.toasts[0].id).toBe(id!);
  });

  it('should auto-remove toast after default duration (3000ms)', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast({ message: 'Auto remove' });
    });

    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it('should auto-remove toast after custom duration', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast({ message: 'Custom', duration: 5000 });
    });

    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(4999);
    });
    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.toasts).toHaveLength(0);
  });

  it('should manually remove a toast with removeToast', () => {
    const { result } = renderHook(() => useToast());

    let id: string;
    act(() => {
      id = result.current.showToast({ message: 'Remove me' });
    });

    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      result.current.removeToast(id!);
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it('should handle multiple simultaneous toasts', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast({ message: 'First' });
      result.current.showToast({ message: 'Second' });
      result.current.showToast({ message: 'Third' });
    });

    expect(result.current.toasts).toHaveLength(3);
    expect(result.current.toasts.map((t) => t.message)).toEqual(['First', 'Second', 'Third']);
  });

  it('should default type to success', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast({ message: 'Default type' });
    });

    expect(result.current.toasts[0].type).toBe('success');
  });
});
