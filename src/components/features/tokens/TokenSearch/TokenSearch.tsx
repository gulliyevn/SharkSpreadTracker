import { Search } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/utils/cn';

interface TokenSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * Компонент поиска токенов
 */
export function TokenSearch({
  value,
  onChange,
  placeholder,
}: TokenSearchProps) {
  const { t } = useLanguage();

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-500 dark:text-gray-500" />
      <input
        type="text"
        value={value}
        onChange={(e) => {
          // Обновляем значение напрямую без санитизации (React уже защищает от XSS)
          onChange(e.target.value);
        }}
        placeholder={
          placeholder ||
          t('tokens.searchPlaceholder') ||
          'Search token (BTC, SOL)...'
        }
        aria-label={t('tokens.searchPlaceholder') || 'Search for tokens'}
        aria-describedby="token-search-description"
        className={cn(
          'w-full pl-10 pr-4 py-3 sm:py-2.5 rounded-lg border',
          'bg-white dark:bg-dark-800 border-light-300 dark:border-dark-700',
          'text-sm sm:text-base text-gray-900 dark:text-white',
          'placeholder:text-gray-400 dark:placeholder:text-gray-500',
          'focus:outline-none',
          'transition-all min-h-[44px] sm:min-h-auto', // Минимум 44px высота для touch на мобильных
          'touch-manipulation' // Оптимизация для touch-устройств
        )}
      />
      <span id="token-search-description" className="sr-only">
        {t('tokens.searchDescription') || 'Search tokens by symbol or name'}
      </span>
    </div>
  );
}
