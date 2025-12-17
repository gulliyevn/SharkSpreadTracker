import type { HTMLAttributes } from 'react';
import { memo } from 'react';
import { cn } from '@/utils/cn';

export interface PriceDisplayProps extends HTMLAttributes<HTMLSpanElement> {
  /**
   * Текущая цена токена. Если null/undefined – показываем тире.
   */
  value: number | null | undefined;
  /**
   * Символ валюты. По умолчанию USD.
   */
  currency?: string;
  /**
   * Количество знаков после запятой.
   */
  fractionDigits?: number;
}

/**
 * Универсальный компонент для отображения цены токена.
 * Отдельный компонент позволяет переиспользовать стили и логику форматирования.
 * Оптимизирован с помощью React.memo для предотвращения лишних ререндеров.
 */
export const PriceDisplay = memo(function PriceDisplay({
  value,
  currency = 'USD',
  fractionDigits = 0,
  className,
  ...rest
}: PriceDisplayProps) {
  if (value === null || value === undefined) {
    return (
      <span
        className={cn('text-light-600 dark:text-dark-400', className)}
        {...rest}
      >
        —
      </span>
    );
  }

  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);

  return (
    <span
      className={cn('text-dark-950 dark:text-dark-50', className)}
      {...rest}
    >
      {formatted}
    </span>
  );
});
