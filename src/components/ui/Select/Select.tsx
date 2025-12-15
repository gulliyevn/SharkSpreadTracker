import { SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/utils/cn';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  helperText?: string;
}

/**
 * Компонент select
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, helperText, children, ...props }, ref) => {
    return (
      <div className="w-full">
        <select
          ref={ref}
          className={cn(
            'w-full px-3 py-2 rounded-lg border transition-colors',
            'bg-light-50 dark:bg-dark-800',
            'border-light-300 dark:border-dark-700',
            'text-dark-950 dark:text-dark-50',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
            "appearance-none bg-[url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e\")] bg-[length:1em] bg-[right_0.5rem_center] bg-no-repeat pr-10",
            error &&
              'border-error-500 dark:border-error-500 focus:ring-error-500',
            className
          )}
          {...props}
        >
          {children}
        </select>
        {helperText && (
          <p
            className={cn(
              'mt-1 text-xs',
              error
                ? 'text-error-600 dark:text-error-400'
                : 'text-light-600 dark:text-dark-400'
            )}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
