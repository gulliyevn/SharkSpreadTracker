import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Хук для использования переводов
 * Обертка над LanguageContext для удобства
 * @deprecated Используйте useLanguage напрямую
 */
export function useTranslation() {
  return useLanguage();
}
