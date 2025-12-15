import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/utils/cn';

export interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {}

/**
 * Body карточки
 */
export const CardBody = forwardRef<HTMLDivElement, CardBodyProps>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn('p-4 sm:p-6', className)} {...props} />;
  }
);

CardBody.displayName = 'CardBody';
