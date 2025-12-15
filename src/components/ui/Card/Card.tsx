import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/utils/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {}

/**
 * Компонент карточки
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-light-50 dark:bg-dark-800 border border-light-200 dark:border-dark-700 rounded-lg shadow-sm',
          className
        )}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';
