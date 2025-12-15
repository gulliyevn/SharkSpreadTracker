import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useApiKey } from '../useApiKey';
import { validateApiKey } from '@/utils/validation';

vi.mock('@/utils/validation', () => ({
  validateApiKey: vi.fn(),
}));

describe('useApiKey', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(validateApiKey).mockReturnValue(true);
  });

  it('should initialize with null', () => {
    const { result } = renderHook(() => useApiKey());
    expect(result.current.apiKey).toBeNull();
  });

  it('should set API key', () => {
    const { result } = renderHook(() => useApiKey());

    act(() => {
      result.current.setApiKey('test-key-123');
    });

    expect(result.current.apiKey).toBe('test-key-123');
    expect(result.current.isValid).toBe(true);
  });

  it('should remove API key', () => {
    const { result } = renderHook(() => useApiKey());

    act(() => {
      result.current.setApiKey('test-key-123');
    });

    expect(result.current.apiKey).toBe('test-key-123');

    act(() => {
      result.current.removeApiKey();
    });

    expect(result.current.apiKey).toBeNull();
  });

  it('should validate API key format', () => {
    vi.mocked(validateApiKey).mockReturnValue(false);
    const { result } = renderHook(() => useApiKey());

    expect(() => {
      act(() => {
        result.current.setApiKey('invalid-key');
      });
    }).toThrow('Неверный формат API ключа');
  });

  it('should return valid key', () => {
    const { result } = renderHook(() => useApiKey());

    act(() => {
      result.current.setApiKey('valid-key-123');
    });

    expect(result.current.getValidKey()).toBe('valid-key-123');
  });

  it('should return null for invalid key', () => {
    vi.mocked(validateApiKey).mockReturnValue(false);
    const { result } = renderHook(() => useApiKey());

    act(() => {
      result.current.setApiKey('invalid');
    });

    expect(result.current.getValidKey()).toBeNull();
  });
});
