import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/utils/cn';

export type CardHeaderProps = HTMLAttributes<HTMLDivElement>;

/**
 * Header карточки
 */
export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'p-4 sm:p-6 border-b border-light-200 dark:border-dark-700',
          className
        )}
        {...props}
      />
    );
  }
);

CardHeader.displayName = 'CardHeader';
