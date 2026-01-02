import { useMemo, memo, useEffect, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { cn } from '@/utils/cn';
import { calculateSpread } from '@/utils/calculations';
import { TIMEFRAMES } from '@/constants/timeframes';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { SpreadResponse, SourceType, TimeframeOption } from '@/types';

export interface ChartTooltipData {
  timestamp: number;
  directSpread: number | null;
  reverseSpread: number | null;
}

export interface SpreadChartProps {
  spreadData: SpreadResponse | null;
  source1: SourceType | null;
  source2: SourceType | null;
  timeframe: TimeframeOption;
  isLoading?: boolean;
  className?: string;
  onTooltipDataChange?: (data: ChartTooltipData | null) => void;
}

/**
 * Округлить timestamp до начала интервала таймфрейма
 * Важно: всегда округляет ВНИЗ до начала интервала
 */
function roundToTimeframe(timestamp: number, intervalMinutes: number): number {
  const date = new Date(timestamp);
  const rounded = new Date(date);

  // Всегда обнуляем секунды и миллисекунды
  rounded.setSeconds(0);
  rounded.setMilliseconds(0);

  if (intervalMinutes < 60) {
    // Для интервалов меньше часа (1m, 5m, 15m): округляем минуты ВНИЗ
    const minutes = date.getMinutes();
    const roundedMinutes =
      Math.floor(minutes / intervalMinutes) * intervalMinutes;
    rounded.setMinutes(roundedMinutes);
  } else if (intervalMinutes < 1440) {
    // Для интервалов меньше дня (1h, 4h): округляем общее количество минут ВНИЗ
    const totalMinutes = date.getHours() * 60 + date.getMinutes();
    const roundedTotalMinutes =
      Math.floor(totalMinutes / intervalMinutes) * intervalMinutes;
    const roundedHours = Math.floor(roundedTotalMinutes / 60);
    const roundedMins = roundedTotalMinutes % 60;
    rounded.setHours(roundedHours);
    rounded.setMinutes(roundedMins);
  } else {
    // Для интервалов в днях (1d): округляем до начала дня
    rounded.setHours(0);
    rounded.setMinutes(0);
  }

  return rounded.getTime();
}

/**
 * График спреда с двумя линиями (Direct и Reverse spread)
 * Использует Apache ECharts для лучшей работы с таймфреймами
 */
export const SpreadChart = memo(function SpreadChart({
  spreadData,
  source1,
  source2,
  timeframe,
  isLoading = false,
  className,
  onTooltipDataChange,
}: SpreadChartProps) {
  const chartRef = useRef<ReactECharts>(null);
  const { resolvedTheme } = useTheme();
  const { t } = useLanguage();
  const intervalMinutes = TIMEFRAMES[timeframe].minutes;

  // Получаем цвета в зависимости от темы
  const themeColors = useMemo(() => {
    const isDark = resolvedTheme === 'dark';
    return {
      textPrimary: isDark ? '#f9fafb' : '#111827',
      textSecondary: isDark ? '#d1d5db' : '#374151',
      textTertiary: isDark ? '#9ca3af' : '#6b7280',
      border: isDark ? '#374151' : '#e5e7eb',
      background: isDark ? '#111827' : '#ffffff',
      gridLine: isDark
        ? 'rgba(229, 231, 235, 0.1)'
        : 'rgba(229, 231, 235, 0.2)',
    };
  }, [resolvedTheme]);

  // Преобразуем данные спреда в формат для графика с фильтрацией по таймфрейму
  const chartData = useMemo(() => {
    if (!spreadData || !source1 || !source2 || !spreadData.history.length) {
      return [];
    }

    // Преобразуем все точки
    const rawData = spreadData.history
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

        const directSpread = calculateSpread(price1, price2);
        const reverseSpread = calculateSpread(price2, price1);

        return {
          timestamp: point.timestamp,
          directSpread: directSpread ?? 0,
          reverseSpread: reverseSpread ?? 0,
        };
      })
      .filter(
        (point) => point.directSpread !== null || point.reverseSpread !== null
      )
      .sort((a, b) => a.timestamp - b.timestamp);

    if (rawData.length === 0) return [];

    // Группируем данные по интервалам таймфрейма
    const groupedMap = new Map<number, (typeof rawData)[0]>();

    for (const point of rawData) {
      const roundedTimestamp = roundToTimeframe(
        point.timestamp,
        intervalMinutes
      );
      const existing = groupedMap.get(roundedTimestamp);

      if (!existing || point.timestamp > existing.timestamp) {
        groupedMap.set(roundedTimestamp, point);
      }
    }

    // Преобразуем в формат для ECharts: [timestamp, directSpread, reverseSpread]
    const filteredData = Array.from(groupedMap.entries())
      .map(([roundedTimestamp, point]) => [
        roundedTimestamp, // timestamp
        point.directSpread, // directSpread
        point.reverseSpread, // reverseSpread
      ])
      .sort((a, b) => (a[0] as number) - (b[0] as number));

    // Добавляем пустое пространство в конце (3 часа после последней точки)
    if (filteredData.length > 0) {
      const lastPoint = filteredData[filteredData.length - 1];
      if (
        lastPoint &&
        Array.isArray(lastPoint) &&
        typeof lastPoint[0] === 'number'
      ) {
        const lastTimestamp = lastPoint[0];
        const emptySpaceEnd = lastTimestamp + 3 * 60 * 60 * 1000; // +3 часа

        // Добавляем одну пустую точку в конце для создания пустого пространства
        // ECharts будет растягивать график до этой точки
        filteredData.push([
          emptySpaceEnd, // timestamp
          NaN, // directSpread (NaN = нет данных для ECharts)
          NaN, // reverseSpread (NaN = нет данных для ECharts)
        ] as [number, number, number]);
      }
    }

    return filteredData;
  }, [spreadData, source1, source2, intervalMinutes]);

  // Вычисляем диапазон значений для оси Y (центрируем 0)
  const { yMin, yMax } = useMemo(() => {
    if (chartData.length === 0) {
      return { yMin: -1, yMax: 1 };
    }

    const allValues = chartData
      .flatMap((point) => [point[1] as number, point[2] as number])
      .filter((v): v is number => typeof v === 'number' && !isNaN(v));

    if (allValues.length === 0) {
      return { yMin: -1, yMax: 1 };
    }

    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    const maxAbsValue = Math.max(Math.abs(minValue), Math.abs(maxValue));
    const padding = Math.max(maxAbsValue * 0.15, 0.5);
    const symmetricRange = maxAbsValue + padding;

    return {
      yMin: -symmetricRange,
      yMax: symmetricRange,
    };
  }, [chartData]);

  // Конфигурация ECharts
  const option = useMemo(() => {
    if (chartData.length === 0) {
      return {};
    }

    return {
      grid: {
        left: '70px',
        right: '30px',
        top: '10px',
        bottom: '50px',
        containLabel: false,
      },
      xAxis: {
        type: 'time' as const,
        boundaryGap: false, // Не добавляем отступ, используем пустые точки
        axisLine: {
          show: true,
          onZero: false,
          lineStyle: {
            color: '#ffffff', // Белая линия для нижней границы (над датой)
            width: 1,
          },
        },
        axisLabel: {
          color: themeColors.textSecondary,
          fontSize: 11,
          rotate: 0, // Без поворота - ровно
          formatter: (value: number) => {
            const date = new Date(value);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            return `${day}.${month}`;
          },
        },
        splitLine: {
          show: true,
          lineStyle: {
            type: 'dashed',
            color: themeColors.gridLine,
            opacity: 1,
          },
          // Вертикальные линии по интервалам таймфрейма
          interval: () => {
            // Показываем линии на каждом интервале
            return true;
          },
        },
        minInterval: intervalMinutes * 60 * 1000, // Минимальный интервал
      },
      yAxis: {
        type: 'value' as const,
        scale: false,
        min: yMin,
        max: yMax,
        axisLine: {
          show: true,
          lineStyle: {
            color: '#ffffff', // Белая линия для левой границы
            width: 1,
          },
        },
        axisLabel: {
          color: themeColors.textSecondary,
          fontSize: 12,
          formatter: (value: number) => {
            return value.toFixed(2);
          },
        },
        splitLine: {
          show: false, // Убираем горизонтальные линии (они будут добавлены через markLine для 0)
          lineStyle: {
            type: 'dashed',
            color: themeColors.gridLine,
            opacity: 1,
          },
        },
      },
      tooltip: {
        trigger: 'axis' as const,
        show: true,
        backgroundColor: 'transparent',
        borderWidth: 0,
        textStyle: {
          color: 'transparent',
        },
        formatter: (params: unknown) => {
          if (!onTooltipDataChange) return '';

          if (!params || !Array.isArray(params) || params.length === 0) {
            setTimeout(() => onTooltipDataChange?.(null), 0);
            return '';
          }

          const param = params[0] as { value?: unknown[] };
          if (!param || !param.value || !Array.isArray(param.value)) {
            setTimeout(() => onTooltipDataChange?.(null), 0);
            return '';
          }

          const timestamp = param.value[0];
          if (!timestamp || typeof timestamp !== 'number') {
            setTimeout(() => onTooltipDataChange?.(null), 0);
            return '';
          }

          // Находим данные из chartData по timestamp
          const dataPoint = chartData.find((point) => point[0] === timestamp);
          if (!dataPoint || !Array.isArray(dataPoint)) {
            setTimeout(() => onTooltipDataChange?.(null), 0);
            return '';
          }

          const directSpreadValue = dataPoint[1];
          const reverseSpreadValue = dataPoint[2];
          const directSpread =
            typeof directSpreadValue === 'number' && !isNaN(directSpreadValue)
              ? directSpreadValue
              : null;
          const reverseSpread =
            typeof reverseSpreadValue === 'number' && !isNaN(reverseSpreadValue)
              ? reverseSpreadValue
              : null;

          onTooltipDataChange({
            timestamp,
            directSpread,
            reverseSpread,
          });

          return ''; // Возвращаем пустую строку, чтобы tooltip был невидимым
        },
        axisPointer: {
          show: false, // Скрываем указатель
        },
      },
      dataZoom: [
        {
          type: 'inside' as const,
          start: 0,
          end: 100,
          xAxisIndex: [0],
        },
        {
          type: 'slider' as const,
          show: false, // Скрываем слайдер, используем только внутри графика
          start: 0,
          end: 100,
          xAxisIndex: [0],
        },
      ],
      series: [
        {
          name: 'Direct Spread',
          type: 'line' as const,
          data: chartData.map((point) => [point[0], point[1]]),
          smooth: false,
          lineStyle: {
            color: '#10b981',
            width: 2.5,
          },
          symbol: 'circle',
          symbolSize: 6,
          itemStyle: {
            color: '#eab308', // Желтые точки
          },
          showSymbol: (params: unknown) => {
            // Показываем точки только для реальных данных (не NaN)
            if (!Array.isArray(params) || params.length < 2) return false;
            const value = params[1];
            return (
              !isNaN(value as number) && value !== null && value !== undefined
            );
          },
          connectNulls: false,
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: {
              color: '#eab308',
              width: 2,
              type: 'dashed',
              dashOffset: 4,
            },
            data: [
              {
                yAxis: 0,
              },
            ],
          },
        },
        {
          name: 'Reverse Spread',
          type: 'line' as const,
          data: chartData.map((point) => [point[0], point[2]]),
          smooth: false,
          lineStyle: {
            color: '#ef4444',
            width: 2.5,
          },
          symbol: 'none', // Без точек для reverse spread
          showSymbol: false,
          connectNulls: false,
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: {
              color: '#ffffff',
              width: 1,
              type: 'solid',
            },
            data: [
              {
                yAxis: yMin, // Белая линия для нижней границы (над датой)
              },
            ],
          },
        },
      ],
    };
  }, [
    chartData,
    yMin,
    yMax,
    intervalMinutes,
    themeColors,
    onTooltipDataChange,
  ]);

  // Обновляем график при изменении темы
  useEffect(() => {
    if (chartRef.current && chartData.length > 0) {
      const chartInstance = chartRef.current.getEchartsInstance();
      chartInstance.setOption(
        {
          backgroundColor: 'transparent',
          xAxis: {
            axisLine: {
              show: true,
              lineStyle: {
                color: '#ffffff', // Белая линия для нижней границы
                width: 1,
              },
            },
            axisLabel: {
              color: themeColors.textSecondary,
            },
            splitLine: {
              lineStyle: {
                color: themeColors.gridLine,
              },
            },
          },
          yAxis: {
            axisLine: {
              show: true,
              lineStyle: {
                color: '#ffffff', // Белая линия для левой границы
                width: 1,
              },
            },
            axisLabel: {
              color: themeColors.textSecondary,
            },
          },
        },
        { notMerge: false, lazyUpdate: true }
      );
    }
  }, [resolvedTheme, themeColors, chartData.length]);

  // Очищаем tooltip при уходе мыши с графика
  useEffect(() => {
    if (!chartRef.current || !onTooltipDataChange) return;

    const chartInstance = chartRef.current.getEchartsInstance();

    const handleGlobalOut = () => {
      onTooltipDataChange(null);
    };

    chartInstance.on('globalout', handleGlobalOut);

    return () => {
      chartInstance.off('globalout', handleGlobalOut);
    };
  }, [onTooltipDataChange]);

  if (isLoading) {
    return (
      <Card className={cn('p-4', className)}>
        <div className="h-[450px] sm:h-[500px] flex items-center justify-center">
          <LoadingSpinner size="md" />
        </div>
      </Card>
    );
  }

  if (!spreadData || !source1 || !source2 || chartData.length === 0) {
    return (
      <Card className={cn('p-4', className)}>
        <div className="h-[450px] sm:h-[500px] flex items-center justify-center">
          <p className="text-sm text-light-600 dark:text-dark-400">
            {!source1 || !source2
              ? t('charts.selectCurrency') || 'Выберите валюту на графике'
              : t('charts.noData') || 'Нет данных для отображения'}
          </p>
        </div>
      </Card>
    );
  }

  const handleMouseLeave = () => {
    if (onTooltipDataChange) {
      onTooltipDataChange(null);
    }
  };

  return (
    <Card
      className={cn('p-4 sm:p-6', className)}
      onMouseLeave={handleMouseLeave}
    >
      <div className="h-[450px] sm:h-[500px] w-full">
        <ReactECharts
          ref={chartRef}
          option={option}
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: 'canvas' }}
          notMerge={false}
          lazyUpdate={false}
        />
      </div>
    </Card>
  );
});
