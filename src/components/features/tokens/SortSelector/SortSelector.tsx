import { TrendingUp, ArrowUpAZ, DollarSign } from 'lucide-react';
import { cn } from '@/utils/cn';

export type SortOption = 'spread' | 'name' | 'price';

export interface SortSelectorProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
  className?: string;
}

const sortOptions: Array<{
  value: SortOption;
  label: string;
  icon: React.ReactNode;
}> = [
  {
    value: 'spread',
    label: 'By Spread',
    icon: <TrendingUp className="h-4 w-4" />,
  },
  {
    value: 'name',
    label: 'By Name',
    icon: <ArrowUpAZ className="h-4 w-4" />,
  },
  {
    value: 'price',
    label: 'By Price',
    icon: <DollarSign className="h-4 w-4" />,
  },
];

/**
 * Компонент для выбора сортировки токенов
 * Поддерживает три режима: по спреду (по умолчанию), по имени, по цене
 */
export function SortSelector({
  value,
  onChange,
  className,
}: SortSelectorProps) {
  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      {sortOptions.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            'border',
            value === option.value
              ? 'bg-primary-500 text-white border-primary-500'
              : 'bg-light-100 dark:bg-dark-900 border-light-300 dark:border-dark-700 text-dark-950 dark:text-dark-50 hover:bg-light-200 dark:hover:bg-dark-800'
          )}
          aria-pressed={value === option.value}
        >
          {option.icon}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}
