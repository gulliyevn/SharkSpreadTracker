import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ViewProvider, useView } from '../ViewContext';

describe('ViewContext', () => {
  describe('ViewProvider', () => {
    it('should provide default view (tokens)', () => {
      const { result } = renderHook(() => useView(), {
        wrapper: ViewProvider,
      });

      expect(result.current.currentView).toBe('tokens');
      expect(typeof result.current.setView).toBe('function');
    });

    it('should change view when setView is called', () => {
      const { result } = renderHook(() => useView(), {
        wrapper: ViewProvider,
      });

      expect(result.current.currentView).toBe('tokens');

      act(() => {
        result.current.setView('charts');
      });

      expect(result.current.currentView).toBe('charts');
    });

    it('should allow switching back to tokens view', () => {
      const { result } = renderHook(() => useView(), {
        wrapper: ViewProvider,
      });

      act(() => {
        result.current.setView('charts');
      });

      expect(result.current.currentView).toBe('charts');

      act(() => {
        result.current.setView('tokens');
      });

      expect(result.current.currentView).toBe('tokens');
    });

    it('should throw error when useView is used outside provider', () => {
      // Подавляем console.error для этого теста
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useView());
      }).toThrow('useView must be used within a ViewProvider');

      consoleSpy.mockRestore();
    });
  });
});

