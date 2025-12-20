import { Skeleton } from '@/components/ui/Skeleton';
import { Card } from '@/components/ui/Card';

/**
 * Skeleton для CurrentPricesPanel
 */
export function CurrentPricesPanelSkeleton() {
  return (
    <Card className="p-4" data-testid="current-prices-panel-skeleton">
      <Skeleton variant="text" className="h-5 w-40 mb-4" />
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton variant="text" className="h-4 w-24" />
              <Skeleton variant="text" className="h-4 w-20" />
            </div>
            <Skeleton variant="rectangular" className="h-8 w-full" />
          </div>
        ))}
      </div>
    </Card>
  );
}

