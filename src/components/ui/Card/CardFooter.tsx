import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/utils/cn';

export type CardFooterProps = HTMLAttributes<HTMLDivElement>;

/**
 * Footer карточки
 */
export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'p-4 sm:p-6 border-t border-light-200 dark:border-dark-700',
          className
        )}
        {...props}
      />
    );
  }
);

CardFooter.displayName = 'CardFooter';
