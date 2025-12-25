import { Skeleton } from '@/components/ui/Skeleton';

/**
 * Skeleton для карточки токена
 * Соответствует новому дизайну TokenCard
 */
export function TokenCardSkeleton() {
  return (
    <div className="bg-white dark:bg-dark-800 border border-light-200 dark:border-dark-700 rounded-lg p-1">
      <div className="flex items-center gap-3 w-full">
        {/* Звезда */}
        <Skeleton variant="circular" className="w-7 h-7 flex-shrink-0" />

        {/* Левая часть: название, лимит */}
        <div className="flex flex-col gap-1 flex-1 min-w-0 basis-0">
          {/* Верхняя строка: название, копирование */}
          <div className="flex items-center gap-1.5">
            <Skeleton variant="text" className="h-4 w-16" />
            <Skeleton variant="circular" className="w-5 h-5" />
          </div>
          {/* Средняя строка: Лимит */}
          <div className="flex items-center gap-1.5 pl-8">
            <Skeleton variant="text" className="h-3 w-12" />
          </div>
        </div>

        {/* Средняя часть: иконки обмена */}
        <div className="flex items-center gap-1.5 flex-shrink-0 basis-auto">
          <Skeleton variant="rectangular" className="w-6 h-6 rounded" />
          <Skeleton variant="rectangular" className="w-4 h-4 rounded" />
          <Skeleton variant="rectangular" className="w-6 h-6 rounded" />
        </div>

        {/* Правая часть: кнопка редактирования и спреды */}
        <div className="flex items-center gap-2 flex-shrink-0 basis-auto">
          {/* Кнопка редактирования */}
          <Skeleton variant="rectangular" className="w-7 h-7 rounded border" />
          {/* Контейнер для спредов */}
          <div className="flex items-center h-7 rounded overflow-hidden">
            <Skeleton variant="rectangular" className="min-w-[50px] h-full" />
            <Skeleton variant="rectangular" className="min-w-[50px] h-full" />
      </div>
      </div>
      </div>
    </div>
  );
}
