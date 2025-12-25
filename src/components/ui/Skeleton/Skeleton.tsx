import { cn } from '@/utils/cn';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
}

/**
 * Компонент Skeleton для отображения состояния загрузки
 */
export function Skeleton({
  className,
  variant = 'rectangular',
}: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-light-100 dark:bg-dark-700';

  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded',
  };

  return (
    <div
      className={cn(baseClasses, variantClasses[variant], className)}
      aria-label="Loading..."
      role="status"
    />
  );
}
