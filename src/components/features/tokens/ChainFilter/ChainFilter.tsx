import { memo, useCallback } from 'react';
import { cn } from '@/utils/cn';

export type ChainFilterValue = 'all' | 'solana' | 'bsc';

export interface ChainFilterProps {
  value: ChainFilterValue;
  onChange: (value: ChainFilterValue) => void;
  counts?: {
    all: number;
    solana: number;
    bsc: number;
  };
}

/**
 * Компонент фильтрации токенов по chain (All / BSC / SOL)
 * Три кнопки для выбора фильтра
 */
export const ChainFilter = memo(function ChainFilter({
  value,
  onChange,
  counts,
}: ChainFilterProps) {
  const handleAllClick = useCallback(() => {
    onChange('all');
  }, [onChange]);

  const handleBscClick = useCallback(() => {
    onChange('bsc');
  }, [onChange]);

  const handleSolClick = useCallback(() => {
    onChange('solana');
  }, [onChange]);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleAllClick}
        className={cn(
          'px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors',
          'border',
          value === 'all'
            ? 'bg-primary-600 border-primary-600 text-white hover:bg-primary-700'
            : 'bg-light-100 dark:bg-dark-800 border-light-300 dark:border-dark-700 text-light-700 dark:text-dark-300 hover:bg-light-200 dark:hover:bg-dark-700'
        )}
        aria-label="Show all tokens"
        aria-pressed={value === 'all'}
      >
        All{counts ? ` (${counts.all})` : ''}
      </button>
      <button
        onClick={handleBscClick}
        className={cn(
          'px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors',
          'border',
          value === 'bsc'
            ? 'bg-primary-600 border-primary-600 text-white hover:bg-primary-700'
            : 'bg-light-100 dark:bg-dark-800 border-light-300 dark:border-dark-700 text-light-700 dark:text-dark-300 hover:bg-light-200 dark:hover:bg-dark-700'
        )}
        aria-label="Show BSC tokens"
        aria-pressed={value === 'bsc'}
      >
        BSC{counts ? ` (${counts.bsc})` : ''}
      </button>
      <button
        onClick={handleSolClick}
        className={cn(
          'px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors',
          'border',
          value === 'solana'
            ? 'bg-primary-600 border-primary-600 text-white hover:bg-primary-700'
            : 'bg-light-100 dark:bg-dark-800 border-light-300 dark:border-dark-700 text-light-700 dark:text-dark-300 hover:bg-light-200 dark:hover:bg-dark-700'
        )}
        aria-label="Show Solana tokens"
        aria-pressed={value === 'solana'}
      >
        SOL{counts ? ` (${counts.solana})` : ''}
      </button>
    </div>
  );
});
