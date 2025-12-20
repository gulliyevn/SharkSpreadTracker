import { Card } from '@/components/ui/Card';
import { TIMEFRAME_OPTIONS } from '@/constants/timeframes';
import { cn } from '@/utils/cn';
import type { TimeframeOption } from '@/types';

export interface TimeframeSelectorProps {
  value: TimeframeOption;
  onChange: (value: TimeframeOption) => void;
  className?: string;
}

/**
 * Компонент для выбора таймфрейма
 * Кнопки: 1m, 5m, 15m, 1h, 4h, 1d
 */
export function TimeframeSelector({
  value,
  onChange,
  className,
}: TimeframeSelectorProps) {
  return (
    <Card className={cn('p-4', className)}>
      <h3 className="text-sm font-semibold mb-3 text-dark-950 dark:text-dark-50">
        Timeframe
      </h3>
      <div className="flex flex-wrap gap-2">
        {TIMEFRAME_OPTIONS.map((timeframe) => {
          const isSelected = value === timeframe;

          return (
            <button
              key={timeframe}
              onClick={() => onChange(timeframe)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                'border',
                isSelected
                  ? 'bg-primary-500 text-white border-primary-500 shadow-md'
                  : 'bg-light-100 dark:bg-dark-800 border-light-300 dark:border-dark-700 text-dark-950 dark:text-dark-50 hover:bg-light-200 dark:hover:bg-dark-700 hover:border-primary-500 dark:hover:border-primary-500'
              )}
              aria-label={`Select ${timeframe} timeframe`}
              aria-pressed={isSelected}
              role="button"
            >
              {timeframe}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
