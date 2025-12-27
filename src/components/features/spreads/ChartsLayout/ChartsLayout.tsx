import { useState, useMemo, useCallback, useEffect } from 'react';
import { TokenSelectorSidebar } from '../TokenSelectorSidebar';
import { TimeframeSelector } from '../TimeframeSelector';
import { SourceSelector } from '../SourceSelector';
import { ChartTypeToggle, type ChartType } from '../ChartTypeToggle';
import { SpreadChart } from '../SpreadChart';
import { AutoRefreshToggle } from '../AutoRefreshToggle';
import { CurrentPricesPanel } from '../CurrentPricesPanel';
import { SpreadAnalysisPanel } from '../SpreadAnalysisPanel';
import { useSpreadData } from '@/api/hooks/useSpreadData';
import { logger } from '@/utils/logger';
import type { Token, StraightData } from '@/types';
import type { SourceType } from '@/types';
import type { TimeframeOption } from '@/types';

export interface ChartsLayoutProps {
  tokens: StraightData[];
  className?: string;
}

/**
 * Layout для структуры графиков
 * Трехколоночная структура:
 * - Левая колонка: TokenSelectorSidebar, TimeframeSelector, SourceSelector
 * - Центральная колонка: ChartTypeToggle, SpreadChart, AutoRefreshToggle
 * - Правая колонка: CurrentPricesPanel, SpreadAnalysisPanel
 */
export function ChartsLayout({ tokens, className }: ChartsLayoutProps) {
  // State management
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [timeframe, setTimeframe] = useState<TimeframeOption>('1h');
  const [source1, setSource1] = useState<SourceType | null>(null);
  const [source2, setSource2] = useState<SourceType | null>(null);
  const [chartType, setChartType] = useState<ChartType>('spread');
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);

  // Загружаем настройки из localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('charts-selected-token');
    const savedTimeframe = localStorage.getItem('charts-timeframe');
    const savedSource1 = localStorage.getItem('charts-source1');
    const savedSource2 = localStorage.getItem('charts-source2');
    const savedChartType = localStorage.getItem('charts-chart-type');
    const savedAutoRefresh = localStorage.getItem('charts-auto-refresh');

    if (savedToken) {
      try {
        const token = JSON.parse(savedToken);
        if (token && token.symbol && token.chain) {
          setSelectedToken(token);
        }
      } catch (error) {
        // Логируем ошибку парсинга для отладки
        logger.warn(
          '[ChartsLayout] Failed to parse saved token from localStorage:',
          error
        );
        // Удаляем поврежденные данные
        localStorage.removeItem('charts-selected-token');
      }
    }

    if (
      savedTimeframe &&
      ['1m', '5m', '15m', '1h', '4h', '1d'].includes(savedTimeframe)
    ) {
      setTimeframe(savedTimeframe as TimeframeOption);
    }

    if (
      savedSource1 &&
      ['mexc', 'jupiter', 'pancakeswap'].includes(savedSource1)
    ) {
      setSource1(savedSource1 as SourceType);
    }

    if (
      savedSource2 &&
      ['mexc', 'jupiter', 'pancakeswap'].includes(savedSource2)
    ) {
      setSource2(savedSource2 as SourceType);
    }

    if (
      savedChartType &&
      ['all', 'prices', 'spread'].includes(savedChartType)
    ) {
      setChartType(savedChartType as ChartType);
    }

    if (savedAutoRefresh === 'false') {
      setIsAutoRefresh(false);
    }
  }, []);

  // Сохраняем настройки в localStorage
  useEffect(() => {
    if (selectedToken) {
      localStorage.setItem(
        'charts-selected-token',
        JSON.stringify(selectedToken)
      );
    }
  }, [selectedToken]);

  useEffect(() => {
    localStorage.setItem('charts-timeframe', timeframe);
  }, [timeframe]);

  useEffect(() => {
    if (source1) {
      localStorage.setItem('charts-source1', source1);
    }
  }, [source1]);

  useEffect(() => {
    if (source2) {
      localStorage.setItem('charts-source2', source2);
    }
  }, [source2]);

  useEffect(() => {
    localStorage.setItem('charts-chart-type', chartType);
  }, [chartType]);

  useEffect(() => {
    localStorage.setItem('charts-auto-refresh', String(isAutoRefresh));
  }, [isAutoRefresh]);

  // Получаем данные спреда
  const {
    data: spreadData,
    isLoading: isLoadingSpread,
    refetch: refetchSpread,
  } = useSpreadData(
    selectedToken,
    timeframe,
    isAutoRefresh && selectedToken !== null
  );

  // Обработчики
  const handleTokenSelect = useCallback(
    (token: Token) => {
      // Находим соответствующий StraightData из tokens
      const straightData = tokens.find(
        (row) =>
          (row.token || '').toUpperCase().trim() ===
            token.symbol.toUpperCase() &&
          ((row.network || '').toLowerCase() === token.chain ||
            (token.chain === 'bsc' &&
              (row.network || '').toLowerCase() === 'bep20'))
      );
      if (straightData) {
        // Сохраняем только Token для useSpreadData
        setSelectedToken(token);
      }
    },
    [tokens]
  );

  const handleTimeframeChange = useCallback((value: TimeframeOption) => {
    setTimeframe(value);
  }, []);

  const handleSource1Change = useCallback((source: SourceType) => {
    setSource1(source);
  }, []);

  const handleSource2Change = useCallback((source: SourceType) => {
    setSource2(source);
  }, []);

  const handleChartTypeChange = useCallback((value: ChartType) => {
    setChartType(value);
  }, []);

  const handleAutoRefreshToggle = useCallback((isAuto: boolean) => {
    setIsAutoRefresh(isAuto);
  }, []);

  const handleRefresh = useCallback(() => {
    if (selectedToken) {
      refetchSpread();
    }
  }, [selectedToken, refetchSpread]);

  // Фильтруем токены для селектора (уникальные по symbol-network)
  const uniqueTokens = useMemo(() => {
    const tokenMap = new Map<string, Token>();
    tokens.forEach((row) => {
      const network = (row.network || '').toLowerCase();
      const chain: 'solana' | 'bsc' =
        network === 'bsc' || network === 'bep20' ? 'bsc' : 'solana';
      const symbol = (row.token || '').toUpperCase().trim();
      if (!symbol) return;
      const key = `${symbol}-${chain}`;
      if (!tokenMap.has(key)) {
        tokenMap.set(key, { symbol, chain });
      }
    });
    return Array.from(tokenMap.values()).sort((a, b) =>
      a.symbol.localeCompare(b.symbol)
    );
  }, [tokens]);

  return (
    <div
      className={`grid grid-cols-1 lg:grid-cols-12 gap-4 ${className || ''}`}
    >
      {/* Левая колонка */}
      <div className="lg:col-span-3 space-y-4">
        <TokenSelectorSidebar
          tokens={uniqueTokens}
          value={selectedToken}
          onSelect={handleTokenSelect}
        />
        <TimeframeSelector value={timeframe} onChange={handleTimeframeChange} />
        <SourceSelector
          token={selectedToken}
          source1={source1}
          source2={source2}
          onSource1Change={handleSource1Change}
          onSource2Change={handleSource2Change}
        />
      </div>

      {/* Центральная колонка */}
      <div className="lg:col-span-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <ChartTypeToggle value={chartType} onChange={handleChartTypeChange} />
          <AutoRefreshToggle
            isAuto={isAutoRefresh}
            onToggle={handleAutoRefreshToggle}
            onRefresh={handleRefresh}
          />
        </div>
        {chartType === 'spread' || chartType === 'all' ? (
          <SpreadChart
            spreadData={spreadData || null}
            source1={source1}
            source2={source2}
            isLoading={isLoadingSpread}
          />
        ) : chartType === 'prices' ? (
          <div className="p-8 text-center text-light-600 dark:text-dark-400 border border-light-200 dark:border-dark-700 rounded-lg bg-light-50 dark:bg-dark-800">
            <p className="text-sm">Prices chart will be implemented here</p>
            <p className="text-xs mt-2 opacity-70">
              This feature will show price comparison charts
            </p>
          </div>
        ) : null}
      </div>

      {/* Правая колонка */}
      <div className="lg:col-span-3 space-y-4">
        <CurrentPricesPanel
          token={selectedToken}
          spreadData={spreadData || null}
          isLoading={isLoadingSpread}
        />
        <SpreadAnalysisPanel
          source1={source1}
          source2={source2}
          spreadData={spreadData || null}
        />
      </div>
    </div>
  );
}
