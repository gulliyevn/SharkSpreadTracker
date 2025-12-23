import { Skeleton } from '@/components/ui/Skeleton';
import { Card } from '@/components/ui/Card';

/**
 * Skeleton для ChartsLayout
 * Показывает структуру загрузки графиков
 */
export function ChartsLayoutSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Левая колонка */}
      <div className="lg:col-span-3 space-y-4">
        <Card className="p-4">
          <Skeleton variant="text" className="h-5 w-24 mb-3" />
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} variant="rectangular" className="h-10 w-full" />
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <Skeleton variant="text" className="h-5 w-32 mb-3" />
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} variant="rectangular" className="h-8 w-full" />
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <Skeleton variant="text" className="h-5 w-28 mb-3" />
          <div className="space-y-2">
            <Skeleton variant="rectangular" className="h-10 w-full" />
            <Skeleton variant="rectangular" className="h-10 w-full" />
          </div>
        </Card>
      </div>

      {/* Центральная колонка */}
      <div className="lg:col-span-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton variant="rectangular" className="h-10 w-32" />
          <Skeleton variant="rectangular" className="h-10 w-24" />
        </div>
        <Card className="p-6">
          <Skeleton variant="text" className="h-6 w-40 mb-4" />
          <Skeleton variant="rectangular" className="h-64 w-full mb-2" />
          <div className="flex gap-2">
            <Skeleton variant="text" className="h-4 w-16" />
            <Skeleton variant="text" className="h-4 w-16" />
            <Skeleton variant="text" className="h-4 w-16" />
          </div>
        </Card>
      </div>

      {/* Правая колонка */}
      <div className="lg:col-span-3 space-y-4">
        <Card className="p-4">
          <Skeleton variant="text" className="h-5 w-32 mb-3" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton variant="text" className="h-4 w-20" />
                <Skeleton variant="rectangular" className="h-8 w-full" />
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <Skeleton variant="text" className="h-5 w-28 mb-3" />
          <div className="space-y-2">
            <Skeleton variant="text" className="h-4 w-full" />
            <Skeleton variant="text" className="h-4 w-3/4" />
            <Skeleton variant="text" className="h-4 w-1/2" />
          </div>
        </Card>
      </div>
    </div>
  );
}
