import { useState, useMemo, useCallback, memo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Brush,
} from 'recharts';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatDateTime } from '@/utils/format';
import { cn } from '@/utils/cn';
import { calculateSpread } from '@/utils/calculations';
import type { SpreadResponse, SourceType } from '@/types';

export interface SpreadChartProps {
  spreadData: SpreadResponse | null;
  source1: SourceType | null;
  source2: SourceType | null;
  isLoading?: boolean;
  className?: string;
}

/**
 * Рассчитывает спред между двумя источниками для точки данных
 * Использует общую утилиту calculateSpread для устранения дублирования
 */
function calculateSpreadForPoint(
  point: SpreadResponse['history'][0],
  source1: SourceType,
  source2: SourceType
): { directSpread: number | null; reverseSpread: number | null } {
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

  // Используем общую утилиту для расчета спреда
  const directSpread = calculateSpread(price1, price2);
  const reverseSpread = calculateSpread(price2, price1);

  return { directSpread, reverseSpread };
}

/**
 * График спреда с двумя линиями (Direct и Reverse spread)
 * Оптимизирован с помощью React.memo для предотвращения лишних ререндеров
 */
export const SpreadChart = memo(function SpreadChart({
  spreadData,
  source1,
  source2,
  isLoading = false,
  className,
}: SpreadChartProps) {
  const [isZoomed, setIsZoomed] = useState(false);

  /**
   * Получить цвет для спреда на основе его значения
   * Положительный (>0): зеленый → арбитражная возможность
   * Отрицательный (<0): красный → невыгодно
   * Нулевой (=0): серый → нет разницы
   */
  const getSpreadColor = useCallback((spread: number | null): string => {
    if (spread === null) {
      return 'rgb(156, 163, 175)'; // gray-400
    }
    if (spread > 0) {
      return 'rgb(34, 197, 94)'; // green-500 - арбитражная возможность
    }
    if (spread < 0) {
      return 'rgb(239, 68, 68)'; // red-500 - невыгодно
    }
    return 'rgb(156, 163, 175)'; // gray-400 - нет разницы
  }, []);

  // Подготавливаем данные для графика
  const chartData = useMemo(() => {
    if (
      !spreadData ||
      !source1 ||
      !source2 ||
      spreadData.history.length === 0
    ) {
      return [];
    }

    return spreadData.history
      .map((point) => {
        const { directSpread, reverseSpread } = calculateSpreadForPoint(
          point,
          source1,
          source2
        );

        const directValue =
          directSpread !== null ? Number(directSpread.toFixed(3)) : null;
        const reverseValue =
          reverseSpread !== null ? Number(reverseSpread.toFixed(3)) : null;

        return {
          timestamp: point.timestamp,
          time: formatDateTime(point.timestamp, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZone: 'UTC',
          }),
          directSpread: directValue,
          reverseSpread: reverseValue,
          // Добавляем цвета для каждой точки
          directSpreadColor: getSpreadColor(directValue),
          reverseSpreadColor: getSpreadColor(reverseValue),
        };
      })
      .filter(
        (point) => point.directSpread !== null || point.reverseSpread !== null
      );
  }, [spreadData, source1, source2, getSpreadColor]);

  const handleDoubleClick = useCallback(() => {
    setIsZoomed(false);
  }, []);

  if (isLoading) {
    return (
      <Card className={cn('p-4', className)}>
        <div className="h-[400px] flex items-center justify-center">
          <LoadingSpinner size="md" />
        </div>
      </Card>
    );
  }

  if (!spreadData || !source1 || !source2) {
    return (
      <Card className={cn('p-4', className)}>
        <div className="h-[400px] flex items-center justify-center">
          <p className="text-sm text-light-600 dark:text-dark-400">
            Select sources to display chart
          </p>
        </div>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className={cn('p-4', className)}>
        <div className="h-[400px] flex items-center justify-center">
          <p className="text-sm text-light-600 dark:text-dark-400">
            No chart data available
          </p>
        </div>
      </Card>
    );
  }

  // Находим диапазон значений для оси Y
  const allValues = chartData
    .flatMap((d) => [d.directSpread, d.reverseSpread])
    .filter((v): v is number => v !== null);

  const minValue = Math.min(...allValues, 0) - 1;
  const maxValue = Math.max(...allValues, 0) + 1;

  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-dark-950 dark:text-dark-50">
            Spread Chart
          </h3>
          <p className="text-xs text-light-600 dark:text-dark-400 mt-1">
            {chartData.length} data points
          </p>
        </div>
        {isZoomed && (
          <button
            onClick={handleDoubleClick}
            className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
          >
            Double-click to reset zoom
          </button>
        )}
      </div>

      <div className="h-[400px] w-full" onDoubleClick={handleDoubleClick}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 20, left: 10, bottom: 80 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="currentColor"
              className="opacity-20"
            />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
              stroke="currentColor"
              className="text-light-600 dark:text-dark-400"
            />
            <YAxis
              domain={[minValue, maxValue]}
              tick={{ fontSize: 12 }}
              label={{
                value: 'Spread (%)',
                angle: -90,
                position: 'insideLeft',
              }}
              stroke="currentColor"
              className="text-light-600 dark:text-dark-400"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-dark-800)',
                border: '1px solid var(--color-dark-700)',
                borderRadius: '8px',
                color: 'var(--color-dark-50)',
              }}
              labelStyle={{ color: 'var(--color-dark-50)' }}
              formatter={(value: unknown, name: string) => {
                if (value === null || value === undefined) return 'N/A';
                const numValue =
                  typeof value === 'number'
                    ? value
                    : typeof value === 'string'
                      ? parseFloat(value)
                      : Number(value);
                if (isNaN(numValue)) return 'N/A';

                // Цветовая схема для tooltip
                const color =
                  numValue > 0
                    ? 'rgb(34, 197, 94)' // green-500 - арбитражная возможность
                    : numValue < 0
                      ? 'rgb(239, 68, 68)' // red-500 - невыгодно
                      : 'rgb(156, 163, 175)'; // gray-400 - нет разницы

                return [
                  <span key={name} style={{ color }}>
                    {numValue > 0 ? '+' : ''}
                    {numValue.toFixed(3)}%
                  </span>,
                  name,
                ];
              }}
              labelFormatter={(label: unknown) => `Time: ${String(label)}`}
            />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="square"
              formatter={(value) => {
                if (value === 'directSpread') return '■ Прямой спред (%)';
                if (value === 'reverseSpread') return '■ Обратный спред (%)';
                return value;
              }}
            />
            <ReferenceLine
              y={0}
              stroke="currentColor"
              strokeWidth={1}
              className="opacity-50"
            />
            <Brush
              dataKey="time"
              height={30}
              stroke="currentColor"
              className="text-light-600 dark:text-dark-400"
            />
            <Line
              type="monotone"
              dataKey="directSpread"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              name="directSpread"
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="reverseSpread"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              name="reverseSpread"
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
});
