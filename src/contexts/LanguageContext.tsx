import React, { createContext, useContext, useCallback } from 'react';
import { useTranslation as useI18nTranslation } from 'react-i18next';
import type { SupportedLanguage } from '@/lib/i18n';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { STORAGE_KEYS } from '@/constants/api';

interface LanguageContextType {
  currentLanguage: SupportedLanguage;
  changeLanguage: (lang: SupportedLanguage) => void;
  t: (key: string) => string;
  isReady: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

interface LanguageProviderProps {
  children: React.ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const { t, i18n } = useI18nTranslation();
  const [storedLanguage, setStoredLanguage] =
    useLocalStorage<SupportedLanguage>(
      STORAGE_KEYS.LANGUAGE,
      'en' as SupportedLanguage
    );

  const changeLanguage = useCallback(
    (lang: SupportedLanguage) => {
      i18n.changeLanguage(lang);
      setStoredLanguage(lang);
    },
    [i18n, setStoredLanguage]
  );

  // Синхронизация с i18next
  React.useEffect(() => {
    if (storedLanguage && storedLanguage !== i18n.language) {
      i18n.changeLanguage(storedLanguage);
    }
  }, [storedLanguage, i18n]);

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage: (i18n.language as SupportedLanguage) || 'en',
        changeLanguage,
        t,
        isReady: i18n.isInitialized,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * Хук для использования языка
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
