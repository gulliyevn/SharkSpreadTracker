import { useMemo, useState, useEffect } from 'react';
import { cn } from '@/utils/cn';
import { useLanguage } from '@/contexts/LanguageContext';
import { calculateSpread } from '@/utils/calculations';
import { loadSpreadHistory } from '@/utils/spreadHistory';
import { logger } from '@/utils/logger';
import type {
  SpreadResponse,
  SourceType,
  Token,
  TimeframeOption,
  SpreadDataPoint,
} from '@/types';

export interface SpreadHistoryTableContentProps {
  spreadData: SpreadResponse | null;
  source1: SourceType | null;
  source2: SourceType | null;
  token: Token | null;
  timeframe: TimeframeOption;
  className?: string;
}

/**
 * Форматирование timestamp в формат DD.MM HH:MM
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}.${month} ${hours}:${minutes}`;
}

/**
 * Содержимое таблицы истории без обертки Card
 */
export function SpreadHistoryTableContent({
  spreadData,
  source1,
  source2,
  token,
  timeframe,
  className,
}: SpreadHistoryTableContentProps) {
  const { t } = useLanguage();
  const [savedHistory, setSavedHistory] = useState<SpreadDataPoint[]>([]);

  // Загружаем сохраненную историю из localStorage/IndexedDB
  useEffect(() => {
    if (!token) {
      setSavedHistory([]);
      return;
    }

    loadSpreadHistory(token, timeframe)
      .then((history) => {
        setSavedHistory(history);
      })
      .catch((error) => {
        logger.error('Failed to load spread history:', error);
        setSavedHistory([]);
      });
  }, [token, timeframe]);

  // Получаем последние 10 точек истории (объединяем сохраненную и текущую)
  const historyRows = useMemo(() => {
    if (!source1 || !source2) {
      return [];
    }

    // Объединяем сохраненную историю и текущие данные из spreadData
    const allPoints: Array<{
      timestamp: number;
      mexc_price: number | null;
      jupiter_price: number | null;
      pancakeswap_price: number | null;
    }> = [];

    // Добавляем сохраненную историю
    if (savedHistory && savedHistory.length > 0) {
      allPoints.push(...savedHistory);
    }

    // Добавляем текущие данные из spreadData (если есть)
    if (spreadData && spreadData.history && spreadData.history.length > 0) {
      spreadData.history.forEach((point) => {
        // Проверяем, нет ли уже такой точки (по timestamp)
        const exists = allPoints.some((p) => p.timestamp === point.timestamp);
        if (!exists) {
          allPoints.push(point);
        }
      });
    }

    // Сортируем по timestamp
    allPoints.sort((a, b) => a.timestamp - b.timestamp);

    const rows = allPoints
      .slice(-10) // Берем последние 10 точек
      .map((point) => {
        const price1 =
          source1 === 'mexc'
            ? point.mexc_price
            : source1 === 'jupiter'
              ? point.jupiter_price
              : point.pancakeswap_price;

        const price2 =
          source2 === 'mexc'
            ? point.mexc_price
            : source2 === 'jupiter'
              ? point.jupiter_price
              : point.pancakeswap_price;

        if (!price1 || !price2) return null;

        const spread = calculateSpread(price1, price2);

        return {
          timestamp: point.timestamp,
          price1,
          price2,
          spread: spread ?? 0,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((a, b) => b.timestamp - a.timestamp); // Сортировка по убыванию (новые сначала)

    return rows;
  }, [spreadData, savedHistory, source1, source2]);

  if (!spreadData || !source1 || !source2) {
    return (
      <div className={cn('flex flex-col', className)}>
        <p className="text-sm text-light-600 dark:text-dark-400">
          {t('charts.selectCurrency') || 'Select currency on chart'}
        </p>
      </div>
    );
  }

  if (historyRows.length === 0) {
    return (
      <div className={cn('flex flex-col', className)}>
        <p className="text-sm text-light-600 dark:text-dark-400">
          {t('charts.noData') || 'No data available'}
        </p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-light-300 dark:border-dark-700">
              <th className="text-center py-2 px-2 text-light-600 dark:text-dark-400 font-medium">
                {t('charts.history.time') || 'Time'}
              </th>
              <th className="text-center py-2 px-2 text-light-600 dark:text-dark-400 font-medium">
                {t('filters.directOnly') || 'Direct'}
              </th>
              <th className="text-center py-2 px-2 text-light-600 dark:text-dark-400 font-medium">
                {t('filters.reverseOnly') || 'Reverse'}
              </th>
              <th className="text-center py-2 px-2 text-light-600 dark:text-dark-400 font-medium">
                {t('charts.history.spread') || 'Spread'}
              </th>
            </tr>
          </thead>
          <tbody>
            {historyRows.map((row, index) => (
              <tr
                key={`${row.timestamp}-${index}`}
                className="border-b border-light-200 dark:border-dark-800 hover:bg-light-50 dark:hover:bg-dark-900 transition-colors"
              >
                <td className="py-2 px-2 text-center text-light-700 dark:text-dark-300">
                  {formatTimestamp(row.timestamp)}
                </td>
                <td className="py-2 px-2 text-center text-light-700 dark:text-dark-300">
                  {row.price1.toFixed(2)}
                </td>
                <td className="py-2 px-2 text-center text-light-700 dark:text-dark-300">
                  {row.price2.toFixed(2)}
                </td>
                <td className="py-2 px-2 text-center">
                  <span
                    className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                      row.spread > 0
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        : row.spread < 0
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300'
                    )}
                  >
                    {row.spread > 0 ? '+' : ''}
                    {row.spread.toFixed(2)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
