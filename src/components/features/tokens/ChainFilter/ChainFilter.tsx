import { memo, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
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
 * Компонент фильтрации токенов по chain (All / SOL / BSC)
 * Одна кнопка с циклическим переключением: All → SOL → BSC → All
 */
export const ChainFilter = memo(function ChainFilter({
  value,
  onChange,
  counts,
}: ChainFilterProps) {
  const { t } = useLanguage();
  
  const handleClick = useCallback(() => {
    // Циклическое переключение: All → SOL → BSC → All
    if (value === 'all') {
      onChange('solana');
    } else if (value === 'solana') {
      onChange('bsc');
    } else {
      onChange('all');
    }
  }, [value, onChange]);

  const getLabel = () => {
    switch (value) {
      case 'all':
        return `${t('filters.all')}${counts ? ` (${counts.all})` : ''}`;
      case 'solana':
        return `SOL${counts ? ` (${counts.solana})` : ''}`;
      case 'bsc':
        return `BSC${counts ? ` (${counts.bsc})` : ''}`;
      default:
        return t('filters.all');
    }
  };

  const getAriaLabel = () => {
    switch (value) {
      case 'all':
        return 'Show all tokens, click to filter by SOL';
      case 'solana':
        return 'Show Solana tokens, click to filter by BSC';
      case 'bsc':
        return 'Show BSC tokens, click to show all';
      default:
        return 'Chain filter';
    }
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors',
        'border',
        'bg-primary-600 border-primary-600 text-white hover:bg-primary-700'
      )}
      aria-label={getAriaLabel()}
      aria-pressed={true}
    >
      {getLabel()}
    </button>
  );
});
