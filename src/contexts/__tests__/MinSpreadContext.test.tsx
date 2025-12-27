import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  MinSpreadProvider,
  useMinSpread,
} from '../MinSpreadContext';

describe('MinSpreadContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('MinSpreadProvider', () => {
    it('should provide default minSpread of 0 when localStorage is empty', () => {
      const { result } = renderHook(() => useMinSpread(), {
        wrapper: MinSpreadProvider,
      });

      expect(result.current.minSpread).toBe(0);
    });

    it('should load minSpread from localStorage on initialization', () => {
      localStorage.setItem('min-spread', '5.5');

      const { result } = renderHook(() => useMinSpread(), {
        wrapper: MinSpreadProvider,
      });

      expect(result.current.minSpread).toBe(5.5);
    });

    it('should ignore invalid localStorage values', () => {
      localStorage.setItem('min-spread', 'invalid');

      const { result } = renderHook(() => useMinSpread(), {
        wrapper: MinSpreadProvider,
      });

      expect(result.current.minSpread).toBe(0);
    });

    it('should ignore negative values from localStorage', () => {
      localStorage.setItem('min-spread', '-5');

      const { result } = renderHook(() => useMinSpread(), {
        wrapper: MinSpreadProvider,
      });

      expect(result.current.minSpread).toBe(0);
    });

    it('should ignore zero from localStorage', () => {
      localStorage.setItem('min-spread', '0');

      const { result } = renderHook(() => useMinSpread(), {
        wrapper: MinSpreadProvider,
      });

      expect(result.current.minSpread).toBe(0);
    });

    it('should update minSpread and save to localStorage', () => {
      const { result } = renderHook(() => useMinSpread(), {
        wrapper: MinSpreadProvider,
      });

      act(() => {
        result.current.setMinSpread(10);
      });

      expect(result.current.minSpread).toBe(10);
      expect(localStorage.getItem('min-spread')).toBe('10');
    });

    it('should remove from localStorage when set to 0', () => {
      localStorage.setItem('min-spread', '5');

      const { result } = renderHook(() => useMinSpread(), {
        wrapper: MinSpreadProvider,
      });

      act(() => {
        result.current.setMinSpread(0);
      });

      expect(result.current.minSpread).toBe(0);
      expect(localStorage.getItem('min-spread')).toBeNull();
    });

    it('should handle decimal values', () => {
      const { result } = renderHook(() => useMinSpread(), {
        wrapper: MinSpreadProvider,
      });

      act(() => {
        result.current.setMinSpread(3.14);
      });

      expect(result.current.minSpread).toBe(3.14);
      expect(localStorage.getItem('min-spread')).toBe('3.14');
    });
  });

  describe('useMinSpread', () => {
    it('should throw error when used outside provider', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      expect(() => {
        renderHook(() => useMinSpread());
      }).toThrow('useMinSpread must be used within a MinSpreadProvider');

      consoleSpy.mockRestore();
    });
  });
});

