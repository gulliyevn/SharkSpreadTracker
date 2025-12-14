import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  helperText?: string;
}

/**
 * Компонент input
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, helperText, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          ref={ref}
          className={cn(
            'w-full px-3 py-2 rounded-lg border transition-colors',
            'bg-light-50 dark:bg-dark-800',
            'border-light-300 dark:border-dark-700',
            'text-dark-950 dark:text-dark-50',
            'placeholder:text-light-500 dark:placeholder:text-dark-500',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
            error &&
              'border-error-500 dark:border-error-500 focus:ring-error-500',
            className
          )}
          {...props}
        />
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

Input.displayName = 'Input';

