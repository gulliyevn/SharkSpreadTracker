import { Skeleton } from '@/components/ui/Skeleton';

/**
 * Skeleton для карточки токена
 */
export function TokenCardSkeleton() {
  return (
    <div className="bg-light-50 dark:bg-dark-800 border border-light-200 dark:border-dark-700 rounded-lg p-3 sm:p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-1">
          <Skeleton variant="circular" className="h-5 w-5" />
          <Skeleton variant="text" className="h-4 w-20" />
        </div>
        <Skeleton variant="text" className="h-4 w-16" />
      </div>
      <div className="flex items-center gap-2 mb-3">
        <Skeleton variant="rectangular" className="h-6 flex-1" />
        <Skeleton variant="rectangular" className="h-6 flex-1" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton variant="rectangular" className="h-8 w-8" />
        <Skeleton variant="rectangular" className="h-8 w-8" />
        <Skeleton variant="rectangular" className="h-8 w-8" />
        <Skeleton variant="rectangular" className="h-8 w-8" />
      </div>
    </div>
  );
}

