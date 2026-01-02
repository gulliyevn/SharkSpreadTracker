import { cn } from '@/utils/cn';
import { Card } from '@/components/ui/Card';
import { useLanguage } from '@/contexts/LanguageContext';
import { SpreadHistoryTableContent } from '@/components/features/spreads/SpreadHistoryTable/SpreadHistoryTableContent';
import type {
  SpreadResponse,
  SourceType,
  Token,
  TimeframeOption,
} from '@/types';

export interface MetricsCardsProps {
  currentSpread?: number | null;
  averageSpread?: number | null;
  maximum?: number | null;
  spreadData?: SpreadResponse | null;
  source1?: SourceType | null;
  source2?: SourceType | null;
  token?: Token | null;
  timeframe?: TimeframeOption;
  className?: string;
}

/**
 * Компонент для отображения метрик спреда и истории в одном контейнере
 */
export function MetricsCards({
  currentSpread = null,
  averageSpread = null,
  maximum = null,
  spreadData = null,
  source1 = null,
  source2 = null,
  token = null,
  timeframe = '1h',
  className,
}: MetricsCardsProps) {
  const { t } = useLanguage();

  return (
    <Card
      className={cn(
        'p-4 bg-white dark:bg-dark-800 border-light-300 dark:border-dark-700 flex flex-col h-full',
        className
      )}
    >
      {/* Метрики */}
      <div className="grid grid-cols-3 gap-4 mb-4 flex-shrink-0">
        {/* Текущий spread */}
        <div className="flex flex-col">
          <span className="text-xs text-gray-600 dark:text-gray-400 mb-1">
            {t('charts.metrics.currentSpread') || 'Current spread'}
          </span>
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {currentSpread !== null ? `${currentSpread.toFixed(2)}%` : '—'}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {t('charts.metrics.lastPoint') || 'last point'}
          </span>
        </div>

        {/* Средний spread */}
        <div className="flex flex-col">
          <span className="text-xs text-gray-600 dark:text-gray-400 mb-1">
            {t('charts.metrics.averageSpread') || 'Average spread'}
          </span>
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {averageSpread !== null ? `${averageSpread.toFixed(2)}%` : '—'}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {t('charts.metrics.byFilter') || 'by filter'}
          </span>
        </div>

        {/* Максимальный spread */}
        <div className="flex flex-col">
          <span className="text-xs text-gray-600 dark:text-gray-400 mb-1">
            {t('charts.metrics.maximum') || 'Maximum'}
          </span>
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {maximum !== null ? `${maximum.toFixed(2)}%` : '—'}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {t('charts.metrics.peak') || 'peak'}
          </span>
        </div>
      </div>

      {/* История */}
      <div className="flex-1 min-h-0 border-t border-light-300 dark:border-dark-700 pt-4">
        <SpreadHistoryTableContent
          spreadData={spreadData}
          source1={source1}
          source2={source2}
          token={token}
          timeframe={timeframe}
          className="h-full"
        />
      </div>
    </Card>
  );
}
