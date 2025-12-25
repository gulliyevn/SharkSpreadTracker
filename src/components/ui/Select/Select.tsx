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
            'bg-white dark:bg-dark-800',
            'border-light-300 dark:border-dark-700',
            'text-gray-900 dark:text-white',
            'focus:outline-none',
            "appearance-none bg-[url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e\")] bg-[length:1em] bg-[right_0.5rem_center] bg-no-repeat pr-10",
            error &&
              'border-error-500 dark:border-error-500',
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
                : 'text-gray-700 dark:text-gray-400'
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
