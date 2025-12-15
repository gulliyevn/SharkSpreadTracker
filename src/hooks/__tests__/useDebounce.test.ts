import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '../useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('test', 300));
    expect(result.current).toBe('test');
  });

  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 300 },
      }
    );

    expect(result.current).toBe('initial');

    act(() => {
      rerender({ value: 'updated', delay: 300 });
    });
    // Value should still be initial before timeout
    expect(result.current).toBe('initial');

    // Advance timers
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // After timeout, value should be updated
    expect(result.current).toBe('updated');
  });

  it('should use custom delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 },
      }
    );

    act(() => {
      rerender({ value: 'updated', delay: 500 });
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe('initial'); // Still old value

    act(() => {
      vi.advanceTimersByTime(200);
    });

    // After full delay, value should be updated
    expect(result.current).toBe('updated');
  });

  it('should cancel previous timeout on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 300 },
      }
    );

    act(() => {
      rerender({ value: 'first', delay: 300 });
    });
    vi.advanceTimersByTime(100);
    expect(result.current).toBe('initial'); // Not yet updated

    act(() => {
      rerender({ value: 'second', delay: 300 });
    });
    vi.advanceTimersByTime(100);
    expect(result.current).toBe('initial'); // Still not updated

    act(() => {
      rerender({ value: 'third', delay: 300 });
    });

    // Advance full delay from last change
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Only the last value should be set after timeout
    expect(result.current).toBe('third');
  });
});
