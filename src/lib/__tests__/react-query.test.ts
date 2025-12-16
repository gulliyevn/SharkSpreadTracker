import { describe, it, expect } from 'vitest';
import { queryClient } from '../react-query';

describe('react-query', () => {
  it('should create queryClient with correct default options', () => {
    expect(queryClient).toBeDefined();
    const defaultOptions = queryClient.getDefaultOptions();
    
    expect(defaultOptions.queries).toBeDefined();
    expect(defaultOptions.queries?.staleTime).toBe(5000);
    expect(defaultOptions.queries?.gcTime).toBe(10 * 60 * 1000);
    expect(defaultOptions.queries?.retry).toBe(3);
    expect(defaultOptions.queries?.refetchOnWindowFocus).toBe(false);
    expect(defaultOptions.queries?.refetchOnReconnect).toBe(true);
  });

  it('should have mutations with retry set to 1', () => {
    const defaultOptions = queryClient.getDefaultOptions();
    expect(defaultOptions.mutations?.retry).toBe(1);
  });

  it('should have exponential retry delay function', () => {
    const defaultOptions = queryClient.getDefaultOptions();
    const retryDelay = defaultOptions.queries?.retryDelay;
    
    expect(typeof retryDelay).toBe('function');
    
    if (typeof retryDelay === 'function') {
      const mockError = new Error('Test error');
      expect(retryDelay(0, mockError)).toBe(1000); // 1s
      expect(retryDelay(1, mockError)).toBe(2000); // 2s
      expect(retryDelay(2, mockError)).toBe(4000); // 4s
      expect(retryDelay(3, mockError)).toBeLessThanOrEqual(30000); // Max 30s
    }
  });
});

