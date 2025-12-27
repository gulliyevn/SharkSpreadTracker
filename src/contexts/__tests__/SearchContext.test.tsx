import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { SearchProvider, useSearch } from '../SearchContext';

describe('SearchContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('SearchProvider', () => {
    it('should provide default empty searchTerm', () => {
      const { result } = renderHook(() => useSearch(), {
        wrapper: SearchProvider,
      });

      expect(result.current.searchTerm).toBe('');
    });

    it('should update searchTerm when setSearchTerm is called', () => {
      const { result } = renderHook(() => useSearch(), {
        wrapper: SearchProvider,
      });

      act(() => {
        result.current.setSearchTerm('test query');
      });

      expect(result.current.searchTerm).toBe('test query');
    });

    it('should handle multiple updates', () => {
      const { result } = renderHook(() => useSearch(), {
        wrapper: SearchProvider,
      });

      act(() => {
        result.current.setSearchTerm('first');
      });
      expect(result.current.searchTerm).toBe('first');

      act(() => {
        result.current.setSearchTerm('second');
      });
      expect(result.current.searchTerm).toBe('second');
    });

    it('should handle empty string', () => {
      const { result } = renderHook(() => useSearch(), {
        wrapper: SearchProvider,
      });

      act(() => {
        result.current.setSearchTerm('test');
      });
      expect(result.current.searchTerm).toBe('test');

      act(() => {
        result.current.setSearchTerm('');
      });
      expect(result.current.searchTerm).toBe('');
    });

    it('should handle special characters', () => {
      const { result } = renderHook(() => useSearch(), {
        wrapper: SearchProvider,
      });

      act(() => {
        result.current.setSearchTerm('test@example.com');
      });

      expect(result.current.searchTerm).toBe('test@example.com');
    });
  });

  describe('useSearch', () => {
    it('should throw error when used outside provider', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      expect(() => {
        renderHook(() => useSearch());
      }).toThrow('useSearch must be used within a SearchProvider');

      consoleSpy.mockRestore();
    });
  });
});
