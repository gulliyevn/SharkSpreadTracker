import { cn } from '@/utils/cn';

export interface ProgressProps {
  /**
   * Текущее значение (0-100)
   */
  value: number;
  /**
   * Максимальное значение (по умолчанию 100)
   */
  max?: number;
  /**
   * Размер прогресс-бара
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Показывать ли процент
   */
  showLabel?: boolean;
  /**
   * Кастомный текст вместо процента
   */
  label?: string;
  /**
   * Цвет прогресс-бара
   */
  variant?: 'primary' | 'success' | 'warning' | 'error';
  /**
   * Дополнительные классы
   */
  className?: string;
}

const sizeClasses = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

const variantClasses = {
  primary: 'bg-primary-600 dark:bg-primary-400',
  success: 'bg-success-600 dark:bg-success-400',
  warning: 'bg-warning-600 dark:bg-warning-400',
  error: 'bg-error-600 dark:bg-error-400',
};

/**
 * Компонент прогресс-бара для отображения прогресса долгих операций
 */
export function Progress({
  value,
  max = 100,
  size = 'md',
  showLabel = false,
  label,
  variant = 'primary',
  className,
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={cn('w-full', className)}>
      {(showLabel || label) && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-light-700 dark:text-dark-300">
            {label || `${Math.round(percentage)}%`}
          </span>
        </div>
      )}
      <div
        className={cn(
          'w-full bg-light-200 dark:bg-dark-700 rounded-full overflow-hidden',
          sizeClasses[size]
        )}
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || `Progress: ${Math.round(percentage)}%`}
      >
        <div
          className={cn(
            'h-full transition-all duration-300 ease-out rounded-full',
            variantClasses[variant]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

