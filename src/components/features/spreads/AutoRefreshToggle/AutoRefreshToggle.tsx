import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/utils/cn';

export interface AutoRefreshToggleProps {
  isAuto: boolean;
  onToggle: (isAuto: boolean) => void;
  onRefresh: () => void;
  className?: string;
}

/**
 * Переключатель автообновления
 * Кнопка "Auto" (автообновление) и "Refresh" (ручное обновление)
 */
export function AutoRefreshToggle({
  isAuto,
  onToggle,
  onRefresh,
  className,
}: AutoRefreshToggleProps) {
  const { t } = useLanguage();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    onRefresh();
    // Возвращаем к серому через 500ms
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <button
        onClick={() => onToggle(!isAuto)}
        className={cn(
          'px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors border',
          isAuto
            ? 'bg-primary-600 border-primary-600 text-white hover:bg-primary-700'
            : 'bg-light-200 dark:bg-dark-800 border-light-300 dark:border-dark-700 text-gray-900 dark:text-white hover:bg-light-300 dark:hover:bg-dark-700'
        )}
      >
        {t('common.auto') || 'Auto'}
      </button>
      <button
        onClick={handleRefresh}
        type="button"
        className={cn(
          'flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors border',
          isRefreshing
            ? 'bg-primary-600 border-primary-600 text-white'
            : 'bg-light-200 dark:bg-dark-800 border-light-300 dark:border-dark-700 text-gray-900 dark:text-white hover:bg-light-300 dark:hover:bg-dark-700',
          'active:scale-95 cursor-pointer'
        )}
      >
        <RefreshCw className="h-4 w-4" />
        {t('common.refresh') || 'Refresh'}
      </button>
    </div>
  );
}
