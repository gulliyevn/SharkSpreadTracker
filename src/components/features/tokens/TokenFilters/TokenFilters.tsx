import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/utils/cn';

interface TokenFiltersProps {
  minSpread: number;
  onMinSpreadChange: (value: number) => void;
  showDirectOnly: boolean;
  onDirectOnlyChange: (value: boolean) => void;
  showReverseOnly: boolean;
  onReverseOnlyChange: (value: boolean) => void;
}

/**
 * Фильтры для списка токенов
 */
export function TokenFilters({
  minSpread,
  onMinSpreadChange,
  showDirectOnly,
  onDirectOnlyChange,
  showReverseOnly,
  onReverseOnlyChange,
}: TokenFiltersProps) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      {/* Фильтр по минимальному спреду */}
      <div className="flex items-center gap-2">
        <label className="text-xs sm:text-sm text-light-600 dark:text-dark-400 whitespace-nowrap">
          {t('filters.minSpread') || 'OT:'}
        </label>
        <input
          type="number"
          min="0"
          step="0.1"
          value={minSpread}
          onChange={(e) => onMinSpreadChange(parseFloat(e.target.value) || 0)}
          className={cn(
            'w-16 sm:w-20 px-2 py-1 rounded border text-xs sm:text-sm',
            'bg-light-50 dark:bg-dark-800 border-light-300 dark:border-dark-700',
            'text-dark-950 dark:text-dark-50',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent'
          )}
        />
        <span className="text-xs sm:text-sm text-light-600 dark:text-dark-400">
          %
        </span>
      </div>

      {/* Кнопки фильтров */}
      <button
        onClick={() => {
          onDirectOnlyChange(!showDirectOnly);
          if (!showDirectOnly) {
            onReverseOnlyChange(false);
          }
        }}
        className={cn(
          'px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors',
          'border',
          showDirectOnly
            ? 'bg-primary-600 border-primary-600 text-white'
            : 'bg-light-100 dark:bg-dark-800 border-light-300 dark:border-dark-700 text-light-700 dark:text-dark-300 hover:bg-light-200 dark:hover:bg-dark-700'
        )}
      >
        {t('filters.directOnly') || 'Только прямой'}
      </button>

      <button
        onClick={() => {
          onReverseOnlyChange(!showReverseOnly);
          if (!showReverseOnly) {
            onDirectOnlyChange(false);
          }
        }}
        className={cn(
          'px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors',
          'border',
          showReverseOnly
            ? 'bg-primary-600 border-primary-600 text-white'
            : 'bg-light-100 dark:bg-dark-800 border-light-300 dark:border-dark-700 text-light-700 dark:text-dark-300 hover:bg-light-200 dark:hover:bg-dark-700'
        )}
      >
        {t('filters.reverseOnly') || 'Только обратный'}
      </button>
    </div>
  );
}
