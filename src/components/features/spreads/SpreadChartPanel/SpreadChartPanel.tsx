import { useMemo } from 'react';
import { SpreadChart, type ChartTooltipData } from '@/components/features/spreads/SpreadChart';
import { useSpreadData } from '@/api/hooks/useSpreadData';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTimeframeLabel } from '@/utils/i18n-helpers';
import { TIMEFRAME_OPTIONS } from '@/constants/timeframes';
import { cn } from '@/utils/cn';
import type { Token, TimeframeOption, SourceType } from '@/types';

export interface SpreadChartPanelProps {
  token: Token | null;
  timeframe: TimeframeOption;
  onTimeframeChange: (timeframe: TimeframeOption) => void;
  isOpen?: boolean; // Флаг для управления загрузкой данных (например, когда модальное окно открыто)
  className?: string;
  onTooltipDataChange?: (data: ChartTooltipData | null) => void;
}

/**
 * Компонент панели с графиком спреда и селектором таймфрейма
 * Таймфрейм селектор расположен справа сверху внутри контейнера
 */
export function SpreadChartPanel({
  token,
  timeframe,
  onTimeframeChange,
  isOpen = true,
  className,
  onTooltipDataChange,
}: SpreadChartPanelProps) {
  const { t } = useLanguage();

  // Определяем источники для графика (по умолчанию для chain)
  const defaultSources = useMemo<{
    source1: SourceType | null;
    source2: SourceType | null;
  }>(() => {
    if (!token) return { source1: null, source2: null };
    if (token.chain === 'solana') {
      return { source1: 'jupiter' as const, source2: 'mexc' as const };
    }
    return { source1: 'pancakeswap' as const, source2: 'mexc' as const };
  }, [token]);

  // Получаем данные спреда для графика с выбранным timeframe
  const {
    data: spreadData,
    isLoading: isLoadingSpread,
  } = useSpreadData(token, timeframe, isOpen && token !== null);

  if (!token) {
    return null;
  }

  return (
    <div className={cn('relative', className)}>
      {/* TimeframeSelector справа сверху - встроенные кнопки */}
      <div className="absolute top-4 z-10" style={{ right: 'calc(1rem + 36px)' }}>
        <div className="bg-white dark:bg-dark-800 border border-light-300 dark:border-dark-700 rounded-lg p-2">
          <div className="flex flex-wrap gap-1.5">
            {TIMEFRAME_OPTIONS.map((tf) => {
              const isSelected = timeframe === tf;
              const timeframeLabel = getTimeframeLabel(tf, t);
              
              return (
                <button
                  key={tf}
                  onClick={() => onTimeframeChange(tf)}
                  className={cn(
                    'px-2 py-1 rounded-lg text-xs font-medium transition-all',
                    'border',
                    isSelected
                      ? 'bg-primary-500 text-white border-primary-500 shadow-md'
                      : 'bg-light-100 dark:bg-dark-800 border-light-300 dark:border-dark-700 text-dark-950 dark:text-dark-50 hover:bg-light-200 dark:hover:bg-dark-700 hover:border-primary-500 dark:hover:border-primary-500'
                  )}
                  aria-label={`Select ${timeframeLabel} timeframe`}
                  aria-pressed={isSelected}
                >
                  {timeframeLabel}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* График спреда - SpreadChart уже содержит свой Card */}
      <SpreadChart
        spreadData={spreadData || null}
        source1={defaultSources.source1}
        source2={defaultSources.source2}
        timeframe={timeframe}
        isLoading={isLoadingSpread}
        onTooltipDataChange={onTooltipDataChange}
      />
    </div>
  );
}
