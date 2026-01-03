import { useLanguage } from '@/contexts/LanguageContext';
import { sanitizeNumber } from '@/utils/security';
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
          onChange={(e) => {
            // Санитизация числового ввода
            const sanitized = sanitizeNumber(e.target.value);
            onMinSpreadChange(sanitized !== null ? sanitized : 0);
          }}
          className={cn(
            'w-16 sm:w-20 px-2 py-1 rounded border text-xs sm:text-sm',
            'bg-light-50 dark:bg-dark-800 border-light-300 dark:border-dark-700',
            'text-dark-950 dark:text-dark-50',
            'focus:outline-none'
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
          'px-3 py-2.5 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors touch-manipulation',
          'min-h-[44px] flex items-center justify-center', // Минимум 44px высота для touch targets
          'border',
          showDirectOnly
            ? 'bg-primary-600 border-primary-600 text-white'
            : 'bg-light-100 dark:bg-dark-800 border-light-300 dark:border-dark-700 text-light-700 dark:text-dark-300 hover:bg-light-200 dark:hover:bg-dark-700'
        )}
        aria-label={
          showDirectOnly
            ? 'Hide direct spread only filter'
            : 'Show direct spread only filter'
        }
        aria-pressed={showDirectOnly}
        role="switch"
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
          'px-3 py-2.5 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors touch-manipulation',
          'min-h-[44px] flex items-center justify-center', // Минимум 44px высота для touch targets
          'border',
          showReverseOnly
            ? 'bg-primary-600 border-primary-600 text-white'
            : 'bg-light-100 dark:bg-dark-800 border-light-300 dark:border-dark-700 text-light-700 dark:text-dark-300 hover:bg-light-200 dark:hover:bg-dark-700'
        )}
        aria-label={
          showReverseOnly
            ? 'Hide reverse spread only filter'
            : 'Show reverse spread only filter'
        }
        aria-pressed={showReverseOnly}
        role="switch"
      >
        {t('filters.reverseOnly') || 'Только обратный'}
      </button>
    </div>
  );
}
