import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useInfiniteScroll } from '../useInfiniteScroll';

describe('useInfiniteScroll', () => {
  let mockObserve: ReturnType<typeof vi.fn>;
  let mockDisconnect: ReturnType<typeof vi.fn>;
  let MockIntersectionObserver: typeof IntersectionObserver;

  beforeEach(() => {
    mockObserve = vi.fn();
    mockDisconnect = vi.fn();

    MockIntersectionObserver = class {
      observe = mockObserve;
      disconnect = mockDisconnect;
      unobserve = vi.fn();
      takeRecords = vi.fn(() => []);
      root = null;
      rootMargin = '';
      thresholds = [];
    } as unknown as typeof IntersectionObserver;

    if (typeof globalThis !== 'undefined') {
      globalThis.IntersectionObserver = MockIntersectionObserver;
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return ref', () => {
    const onLoadMore = vi.fn();
    const { result } = renderHook(() =>
      useInfiniteScroll({
        hasMore: true,
        isLoading: false,
        onLoadMore,
      })
    );

    expect(result.current).toBeDefined();
    expect(result.current.current).toBeNull(); // Initially null
  });

  it('should return ref for observer target', () => {
    const onLoadMore = vi.fn();
    const { result } = renderHook(() =>
      useInfiniteScroll({
        hasMore: true,
        isLoading: false,
        onLoadMore,
      })
    );

    // Should return a ref object
    expect(result.current).toBeDefined();
    expect(typeof result.current).toBe('object');
    expect('current' in result.current).toBe(true);
  });
});
