import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/utils/cn';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Компонент badge
 */
export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    { className, variant = 'default', size = 'md', children, ...props },
    ref
  ) => {
    const baseClasses = 'inline-flex items-center font-medium rounded-full';

    const variantClasses = {
      default: 'bg-light-200 text-dark-950 dark:bg-dark-700 dark:text-dark-50',
      success:
        'bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-400',
      error:
        'bg-error-100 text-error-800 dark:bg-error-900/30 dark:text-error-400',
      warning:
        'bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-400',
      info: 'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-400',
    };

    const sizeClasses = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-1 text-sm',
      lg: 'px-3 py-1.5 text-base',
    };

    return (
      <span
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
