import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTranslation } from '../useTranslation';
import { useLanguage } from '@/contexts/LanguageContext';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: vi.fn(),
}));

describe('useTranslation', () => {
  it('should return useLanguage result', () => {
    const mockLanguage = {
      t: vi.fn((key: string) => key),
      currentLanguage: 'en' as const,
      changeLanguage: vi.fn(),
      isReady: true,
    };

    vi.mocked(useLanguage).mockReturnValue(mockLanguage);

    const { result } = renderHook(() => useTranslation());

    expect(result.current).toEqual(mockLanguage);
    expect(useLanguage).toHaveBeenCalled();
  });
});

