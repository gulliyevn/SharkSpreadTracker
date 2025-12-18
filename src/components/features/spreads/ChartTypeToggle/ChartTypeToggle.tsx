import { cn } from '@/utils/cn';

export type ChartType = 'all' | 'prices' | 'spread';

export interface ChartTypeToggleProps {
  value: ChartType;
  onChange: (value: ChartType) => void;
  className?: string;
}

const chartTypes: Array<{ value: ChartType; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'prices', label: 'Prices' },
  { value: 'spread', label: 'Spread' },
];

/**
 * Переключатель типа графика
 * Кнопки: All / Prices / Spread
 */
export function ChartTypeToggle({
  value,
  onChange,
  className,
}: ChartTypeToggleProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {chartTypes.map((type) => {
        const isSelected = value === type.value;

        return (
          <button
            key={type.value}
            onClick={() => onChange(type.value)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              'border',
              isSelected
                ? 'bg-primary-500 text-white border-primary-500 shadow-md'
                : 'bg-light-100 dark:bg-dark-800 border-light-300 dark:border-dark-700 text-dark-950 dark:text-dark-50 hover:bg-light-200 dark:hover:bg-dark-700 hover:border-primary-500 dark:hover:border-primary-500'
            )}
            aria-pressed={isSelected}
          >
            {type.label}
          </button>
        );
      })}
    </div>
  );
}
