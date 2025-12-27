import { memo } from 'react';
import { ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { SOURCES } from '@/constants/sources';
import { cn } from '@/utils/cn';
import { calculateSpread } from '@/utils/calculations';
import type { SourceType } from '@/types';
import type { SpreadResponse } from '@/types';

export interface SpreadAnalysisPanelProps {
  source1: SourceType | null;
  source2: SourceType | null;
  spreadData: SpreadResponse | null;
  className?: string;
}

/**
 * Рассчитывает спред между двумя источниками
 * Использует общую утилиту calculateSpread для устранения дублирования
 */
function calculateSpreadBetweenSources(
  price1: number | null,
  price2: number | null
): number | null {
  return calculateSpread(price1, price2);
}

/**
 * Панель анализа спреда с подсказками действий
 * Оптимизирован с помощью React.memo для предотвращения лишних ререндеров
 */
export const SpreadAnalysisPanel = memo(function SpreadAnalysisPanel({
  source1,
  source2,
  spreadData,
  className,
}: SpreadAnalysisPanelProps) {
  if (!source1 || !source2 || !spreadData) {
    return (
      <Card className={cn('p-4', className)}>
        <h3 className="text-sm font-semibold mb-3 text-dark-950 dark:text-dark-50">
          Spread Analysis
        </h3>
        <p className="text-sm text-light-600 dark:text-dark-400">
          Select sources to compare
        </p>
      </Card>
    );
  }

  const source1Config = SOURCES[source1];
  const source2Config = SOURCES[source2];

  if (!spreadData.current) {
    return (
      <Card className={cn('p-4', className)}>
        <h3 className="text-sm font-semibold mb-3 text-dark-950 dark:text-dark-50">
          Spread Analysis
        </h3>
        <p className="text-sm text-light-600 dark:text-dark-400">
          No current price data available
        </p>
      </Card>
    );
  }

  // Получаем цены из spreadData
  const price1 =
    source1 === 'mexc'
      ? spreadData.current.mexc_price
      : source1 === 'jupiter'
        ? spreadData.current.jupiter_price
        : spreadData.current.pancakeswap_price;

  const price2 =
    source2 === 'mexc'
      ? spreadData.current.mexc_price
      : source2 === 'jupiter'
        ? spreadData.current.jupiter_price
        : spreadData.current.pancakeswap_price;

  // Рассчитываем спреды
  const directSpread = calculateSpreadBetweenSources(price1, price2);
  const reverseSpread = calculateSpreadBetweenSources(price2, price1);

  return (
    <Card className={cn('p-4', className)}>
      <h3 className="text-sm font-semibold mb-3 text-dark-950 dark:text-dark-50">
        Spread Analysis
      </h3>

      {/* Заголовок сравнения */}
      <div className="flex items-center justify-center gap-2 mb-4 p-2 rounded-lg bg-light-100 dark:bg-dark-900">
        <span
          className={cn('text-lg', source1Config.colorTailwind)}
          role="img"
          aria-label={source1Config.label}
        >
          {source1Config.emoji}
        </span>
        <ArrowRight className="h-4 w-4 text-light-500 dark:text-dark-500" />
        <span
          className={cn('text-lg', source2Config.colorTailwind)}
          role="img"
          aria-label={source2Config.label}
        >
          {source2Config.emoji}
        </span>
      </div>

      <div className="space-y-3">
        {/* Direct Spread (Source1 → Source2) */}
        <div
          className={cn(
            'p-3 rounded-lg border',
            directSpread !== null && directSpread > 0
              ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
              : directSpread !== null && directSpread < 0
                ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                : 'bg-light-100 dark:bg-dark-900 border-light-300 dark:border-dark-700'
          )}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-light-600 dark:text-dark-400">
              Direct Spread ({source1Config.label} → {source2Config.label})
            </span>
            {directSpread !== null && (
              <Badge
                variant={directSpread > 0 ? 'success' : 'error'}
                className="text-xs"
              >
                {directSpread > 0 ? '+' : ''}
                {directSpread.toFixed(2)}%
              </Badge>
            )}
          </div>
          {directSpread === null ? (
            <p className="text-xs text-light-500 dark:text-dark-500">
              Cannot calculate spread
            </p>
          ) : (
            <p className="text-xs text-light-600 dark:text-dark-400 mt-1">
              Buy on {source1Config.label}, sell on {source2Config.label}
            </p>
          )}
        </div>

        {/* Reverse Spread (Source2 → Source1) */}
        <div
          className={cn(
            'p-3 rounded-lg border',
            reverseSpread !== null && reverseSpread > 0
              ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
              : reverseSpread !== null && reverseSpread < 0
                ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                : 'bg-light-100 dark:bg-dark-900 border-light-300 dark:border-dark-700'
          )}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-light-600 dark:text-dark-400">
              Reverse Spread ({source2Config.label} → {source1Config.label})
            </span>
            {reverseSpread !== null && (
              <Badge
                variant={reverseSpread > 0 ? 'success' : 'error'}
                className="text-xs"
              >
                {reverseSpread > 0 ? '+' : ''}
                {reverseSpread.toFixed(2)}%
              </Badge>
            )}
          </div>
          {reverseSpread === null ? (
            <p className="text-xs text-light-500 dark:text-dark-500">
              Cannot calculate spread
            </p>
          ) : (
            <p className="text-xs text-light-600 dark:text-dark-400 mt-1">
              Buy on {source2Config.label}, sell on {source1Config.label}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
});
