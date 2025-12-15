import React from 'react';
import { Search } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
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
  const debouncedValue = useDebounce(value, 300);

  // Автоматически применяем debounced значение
  React.useEffect(() => {
    if (debouncedValue !== value) {
      onChange(debouncedValue);
    }
  }, [debouncedValue, value, onChange]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-light-500 dark:text-dark-500" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          placeholder ||
          t('tokens.searchPlaceholder') ||
          'Search token (BTC, SOL)...'
        }
        className={cn(
          'w-full pl-10 pr-4 py-2 sm:py-2.5 rounded-lg border',
          'bg-light-50 dark:bg-dark-800 border-light-300 dark:border-dark-700',
          'text-sm sm:text-base text-dark-950 dark:text-dark-50',
          'placeholder:text-light-500 dark:placeholder:text-dark-500',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
          'transition-all'
        )}
      />
    </div>
  );
}
