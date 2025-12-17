import type { HTMLAttributes } from 'react';
import { memo, useMemo } from 'react';
import { cn } from '@/utils/cn';

export interface SpreadIndicatorProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Значение спреда в процентах. Если null/undefined – отображаем тире.
   */
  value: number | null | undefined;
  /**
   * Тип спреда влияет только на цветовую схему.
   */
  type: 'direct' | 'reverse';
}

/**
 * Универсальный индикатор спреда.
 * Используется в карточке токена и может переиспользоваться в графиках/статистике.
 * Оптимизирован с помощью React.memo и useMemo для предотвращения лишних ререндеров.
 */
export const SpreadIndicator = memo(function SpreadIndicator({
  value,
  type,
  className,
  ...rest
}: SpreadIndicatorProps) {
  const isPositive = typeof value === 'number' && value > 0;

  const baseClasses =
    'flex-1 px-2 py-1 rounded text-xs font-medium text-center select-none whitespace-nowrap';

  const positiveClasses =
    type === 'direct'
      ? 'bg-success-500/20 text-success-600 dark:text-success-400'
      : 'bg-error-500/20 text-error-600 dark:text-error-400';

  const neutralClasses =
    'bg-light-200 dark:bg-dark-700 text-light-600 dark:text-dark-400';

  const display = useMemo(() => {
    if (value === null || value === undefined) return '—';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  }, [value]);

  return (
    <div
      className={cn(
        baseClasses,
        isPositive ? positiveClasses : neutralClasses,
        className
      )}
      {...rest}
    >
      {display}
    </div>
  );
});
