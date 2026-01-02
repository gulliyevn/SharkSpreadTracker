import { useState, useCallback, useMemo, useEffect } from 'react';
import { Container } from '@/components/layout/Container';
import {
  ChainFilter,
  type ChainFilterValue,
} from '@/components/features/tokens/ChainFilter';
import { AutoRefreshToggle } from '@/components/features/spreads/AutoRefreshToggle';
import { TokenCard } from '@/components/features/tokens/TokenCard';
import { SpreadChartPanel } from '@/components/features/spreads/SpreadChartPanel';
import { TokenGrid } from '@/components/features/tokens/TokenGrid';
import { MetricsCards } from '@/components/features/spreads/MetricsCards';
import { TokenCardSkeleton } from '@/components/features/tokens/TokenCardSkeleton';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import { EmptyState } from '@/components/ui/EmptyState';
import { useSpreadData } from '@/api/hooks/useSpreadData';
import { useMinSpread } from '@/contexts/MinSpreadContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTokensWithSpreads } from '@/api/hooks/useTokensWithSpreads';
import { updateSpreadHistory } from '@/utils/spreadHistory';
import { cn } from '@/utils/cn';
import {
  Layers,
  ArrowRightCircle,
  ArrowLeftCircle,
  TrendingUp,
  ArrowUpAZ,
  DollarSign,
} from 'lucide-react';
import type { SortOption } from '@/components/features/tokens/SortSelector';
import type { Token, StraightData, TimeframeOption, SourceType } from '@/types';
import { STORAGE_KEYS } from '@/constants/api';

/**
 * Функция для создания уникального ключа токена (token-network)
 */
function getTokenKey(token: StraightData): string {
  return `${(token.token || '').toUpperCase().trim()}-${(token.network || '').toLowerCase()}`;
}

/**
 * Страница с графиками спреда
 */
export function ChartsPage() {
  const { t } = useLanguage();
  const { minSpread, setMinSpread } = useMinSpread();
  const [chainFilter, setChainFilter] = useState<ChainFilterValue>('all');
  const [showDirectOnly, setShowDirectOnly] = useState(false);
  const [showReverseOnly, setShowReverseOnly] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('spread');
  const [isAutoRefresh, setIsAutoRefresh] = useState(() => {
    const saved = localStorage.getItem('charts-auto-refresh');
    return saved === 'true';
  });

  // Состояния для выбранного токена и графика
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [selectedTokenData, setSelectedTokenData] =
    useState<StraightData | null>(null);
  const [timeframe, setTimeframe] = useState<TimeframeOption>('1h');
  const [tooltipData, setTooltipData] = useState<{
    timestamp: number;
    directSpread: number | null;
    reverseSpread: number | null;
  } | null>(null);

  // Избранные токены (Set с ключами token-network)
  const [favoriteTokens, setFavoriteTokens] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FAVORITE_TOKENS);
      if (saved) {
        const favorites = JSON.parse(saved) as string[];
        return new Set(favorites);
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
    return new Set<string>();
  });

  const handleChainFilterChange = useCallback((value: ChainFilterValue) => {
    setChainFilter(value);
  }, []);

  const handleDirectOnlyChange = useCallback((value: boolean) => {
    setShowDirectOnly(value);
  }, []);

  const handleReverseOnlyChange = useCallback((value: boolean) => {
    setShowReverseOnly(value);
  }, []);

  const handleSortClick = useCallback(() => {
    if (sortOption === 'spread') {
      setSortOption('name');
    } else if (sortOption === 'name') {
      setSortOption('price');
    } else {
      setSortOption('spread');
    }
  }, [sortOption]);

  const handleMinSpreadInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      if (inputValue === '') {
        setMinSpread(0);
        return;
      }
      const value = parseFloat(inputValue);
      if (!isNaN(value) && value >= 0) {
        setMinSpread(value);
      }
    },
    [setMinSpread]
  );

  const handleAutoRefreshToggle = useCallback((isAuto: boolean) => {
    setIsAutoRefresh(isAuto);
    // Сохраняем состояние в localStorage
    localStorage.setItem('charts-auto-refresh', String(isAuto));
  }, []);

  // Загружаем токены из API
  const {
    data: tokens = [],
    isLoading,
    error,
    refetch,
  } = useTokensWithSpreads();

  // Избранные токены для секции наверху
  const favoriteTokensList = useMemo(() => {
    if (favoriteTokens.size === 0) return [];
    // Дедупликация токенов по token+network
    const uniqueMap = new Map<string, StraightData>();
    for (const token of tokens) {
      const key = getTokenKey(token);
      if (favoriteTokens.has(key)) {
        uniqueMap.set(key, token);
      }
    }
    return Array.from(uniqueMap.values());
  }, [tokens, favoriteTokens]);

  // Подсчет токенов по chain (с дедупликацией)
  const chainCounts = useMemo(() => {
    const uniqueMap = new Map<string, StraightData>();
    for (const token of tokens) {
      const key = getTokenKey(token);
      uniqueMap.set(key, token);
    }
    const uniqueTokens = Array.from(uniqueMap.values());

    const counts = {
      all: uniqueTokens.length,
      solana: uniqueTokens.filter((r) => {
        const network = (r.network || '').toLowerCase();
        return network !== 'bsc' && network !== 'bep20';
      }).length,
      bsc: uniqueTokens.filter((r) => {
        const network = (r.network || '').toLowerCase();
        return network === 'bsc' || network === 'bep20';
      }).length,
    };
    return counts;
  }, [tokens]);

  // Фильтруем и сортируем токены
  const filteredTokens = useMemo(() => {
    // Дедупликация токенов по token+network
    const uniqueMap = new Map<string, StraightData>();
    for (const token of tokens) {
      const key = getTokenKey(token);
      uniqueMap.set(key, token);
    }
    let filtered = Array.from(uniqueMap.values());

    // Фильтр по chain
    if (chainFilter !== 'all') {
      filtered = filtered.filter((row) => {
        const network = (row.network || '').toLowerCase();
        if (chainFilter === 'bsc') {
          return network === 'bsc' || network === 'bep20';
        }
        return network !== 'bsc' && network !== 'bep20';
      });
    }

    // Фильтр по direct/reverse
    if (showDirectOnly) {
      filtered = filtered.filter((row) => {
        const spread = row.spread ? Number(row.spread) : null;
        return spread !== null && spread > 0;
      });
    } else if (showReverseOnly) {
      filtered = filtered.filter((row) => {
        const spread = row.spread ? Number(row.spread) : null;
        return spread !== null && spread < 0;
      });
    }

    // Фильтр по минимальному спреду
    if (minSpread > 0) {
      filtered = filtered.filter((row) => {
        const spread = row.spread ? Math.abs(Number(row.spread)) : 0;
        return spread >= minSpread;
      });
    }

    // Сортировка
    filtered.sort((a, b) => {
      const symbolA = (a.token || '').toUpperCase().trim();
      const symbolB = (b.token || '').toUpperCase().trim();

      if (sortOption === 'spread') {
        const spreadA = a.spread ? Math.abs(Number(a.spread)) : 0;
        const spreadB = b.spread ? Math.abs(Number(b.spread)) : 0;
        if (spreadB !== spreadA) {
          return spreadB - spreadA;
        }
        return symbolA.localeCompare(symbolB);
      } else if (sortOption === 'name') {
        return symbolA.localeCompare(symbolB);
      } else if (sortOption === 'price') {
        const priceA1 = a.priceA ? Number(a.priceA) : 0;
        const priceA2 = a.priceB ? Number(a.priceB) : 0;
        const priceB1 = b.priceA ? Number(b.priceA) : 0;
        const priceB2 = b.priceB ? Number(b.priceB) : 0;

        const avgPriceA =
          (priceA1 + priceA2) /
            (priceA1 > 0 && priceA2 > 0
              ? 2
              : priceA1 > 0 || priceA2 > 0
                ? 1
                : 0) || 0;
        const avgPriceB =
          (priceB1 + priceB2) /
            (priceB1 > 0 && priceB2 > 0
              ? 2
              : priceB1 > 0 || priceB2 > 0
                ? 1
                : 0) || 0;

        if (avgPriceB !== avgPriceA) {
          return avgPriceB - avgPriceA;
        }
        return symbolA.localeCompare(symbolB);
      }

      return 0;
    });

    return filtered;
  }, [
    tokens,
    chainFilter,
    showDirectOnly,
    showReverseOnly,
    minSpread,
    sortOption,
  ]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Обработчик выбора токена из TokenGrid
  const handleTokenSelect = useCallback((token: StraightData) => {
    const network = (token.network || '').toLowerCase();
    const chain: 'solana' | 'bsc' =
      network === 'bsc' || network === 'bep20' ? 'bsc' : 'solana';
    const symbol = (token.token || '').toUpperCase().trim();
    setSelectedToken({ symbol, chain });
    setSelectedTokenData(token);
  }, []);

  // Обработчик переключения избранного
  const handleFavoriteToggle = useCallback((token: StraightData) => {
    const tokenKey = getTokenKey(token);
    setFavoriteTokens((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(tokenKey)) {
        newSet.delete(tokenKey);
      } else {
        newSet.add(tokenKey);
      }
      // Сохраняем в localStorage
      try {
        localStorage.setItem(
          STORAGE_KEYS.FAVORITE_TOKENS,
          JSON.stringify(Array.from(newSet))
        );
      } catch (error) {
        console.error('Error saving favorites:', error);
      }
      return newSet;
    });
  }, []);

  // Функция проверки, является ли токен избранным
  const isFavoriteCheck = useCallback(
    (token: StraightData) => {
      const tokenKey = getTokenKey(token);
      return favoriteTokens.has(tokenKey);
    },
    [favoriteTokens]
  );

  // Получаем данные спреда для выбранного токена
  const { data: spreadData } = useSpreadData(
    selectedToken,
    timeframe,
    selectedToken !== null
  );

  // Сохраняем новые данные в историю при их получении
  useEffect(() => {
    if (
      !selectedToken ||
      !spreadData ||
      !spreadData.history ||
      spreadData.history.length === 0
    ) {
      return;
    }

    // Берем последнюю точку из истории как текущую для сохранения
    const lastPoint = spreadData.history[spreadData.history.length - 1];
    if (lastPoint) {
      updateSpreadHistory(selectedToken, lastPoint, timeframe).catch(
        (error) => {
          console.error('Failed to save spread history:', error);
        }
      );
    }
  }, [selectedToken, spreadData, timeframe]);

  // Определяем источники для графика (по умолчанию для chain)
  const defaultSources = useMemo<{
    source1: SourceType | null;
    source2: SourceType | null;
  }>(() => {
    if (!selectedToken) return { source1: null, source2: null };
    if (selectedToken.chain === 'solana') {
      return { source1: 'jupiter' as const, source2: 'mexc' as const };
    }
    return { source1: 'pancakeswap' as const, source2: 'mexc' as const };
  }, [selectedToken]);

  // Вычисляем метрики из spreadData
  const metrics = useMemo(() => {
    // currentSpread всегда берем из selectedTokenData (из TokenCard), а не из истории графика
    const currentSpread = selectedTokenData?.spread
      ? Number(selectedTokenData.spread)
      : null;

    if (!spreadData || !spreadData.history || spreadData.history.length === 0) {
      return {
        currentSpread,
        averageSpread: null,
        maximum: null,
      };
    }

    const spreads = spreadData.history
      .map((point) => {
        const price1 = point.mexc_price;
        const price2 = point.jupiter_price || point.pancakeswap_price;
        if (!price1 || !price2) return null;
        return ((price2 - price1) / price1) * 100;
      })
      .filter((spread): spread is number => spread !== null);

    if (spreads.length === 0) {
      return {
        currentSpread,
        averageSpread: null,
        maximum: null,
      };
    }

    const averageSpread =
      spreads.reduce((sum, val) => sum + Math.abs(val), 0) / spreads.length;
    const maximum = Math.max(...spreads.map(Math.abs));

    return {
      currentSpread,
      averageSpread,
      maximum,
    };
  }, [spreadData, selectedTokenData]);

  const getSortIcon = () => {
    if (sortOption === 'spread') {
      return <TrendingUp className="h-4 w-4" />;
    } else if (sortOption === 'name') {
      return <ArrowUpAZ className="h-4 w-4" />;
    } else {
      return <DollarSign className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-dark-900">
      <Container>
        <div className="max-w-7xl mx-auto py-6 sm:py-8">
          {/* Фильтры - компактная горизонтальная группа */}
          <div className="mb-4 sm:mb-6">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Chain Filter - первая кнопка */}
              <ChainFilter
                value={chainFilter}
                onChange={handleChainFilterChange}
                counts={chainCounts}
              />

              {/* Direct/Reverse - вторая кнопка с переключением: All → Direct → Reverse → All */}
              <button
                onClick={() => {
                  if (!showDirectOnly && !showReverseOnly) {
                    handleDirectOnlyChange(true);
                    handleReverseOnlyChange(false);
                  } else if (showDirectOnly && !showReverseOnly) {
                    handleDirectOnlyChange(false);
                    handleReverseOnlyChange(true);
                  } else {
                    handleDirectOnlyChange(false);
                    handleReverseOnlyChange(false);
                  }
                }}
                className={cn(
                  'flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors border',
                  'bg-primary-600 border-primary-600 text-white hover:bg-primary-700'
                )}
              >
                {!showDirectOnly && !showReverseOnly ? (
                  <>
                    <Layers className="h-4 w-4" />
                    <span>{t('filters.all') || 'All'}</span>
                  </>
                ) : showDirectOnly ? (
                  <>
                    <ArrowRightCircle className="h-4 w-4" />
                    <span>{t('filters.directOnly') || 'Direct'}</span>
                  </>
                ) : (
                  <>
                    <ArrowLeftCircle className="h-4 w-4" />
                    <span>{t('filters.reverseOnly') || 'Reverse'}</span>
                  </>
                )}
              </button>

              {/* Sort - кнопка с циклическим переключением: Spread → Name → Price → Spread */}
              <button
                onClick={handleSortClick}
                className={cn(
                  'flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors border',
                  'bg-primary-600 border-primary-600 text-white hover:bg-primary-700'
                )}
              >
                {getSortIcon()}
                <span>
                  {sortOption === 'spread'
                    ? t('filters.sortBySpread') || 'By Spread'
                    : sortOption === 'name'
                      ? t('filters.sortByName') || 'By Name'
                      : t('filters.sortByPrice') || 'By Price'}
                </span>
              </button>

              {/* Минимальный спред */}
              <div className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border bg-white dark:bg-dark-800 border-light-300 dark:border-dark-700">
                <label className="text-xs sm:text-sm text-gray-700 dark:text-gray-400 whitespace-nowrap">
                  {t('filters.minSpread') || 'Min:'}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={minSpread === 0 ? '' : minSpread}
                  onChange={handleMinSpreadInputChange}
                  placeholder=""
                  className="w-12 px-1.5 py-0.5 rounded text-xs bg-white dark:bg-dark-900 border border-light-300 dark:border-dark-700 text-gray-900 dark:text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-400">
                  %
                </span>
              </div>

              {/* Auto Refresh и Refresh */}
              <AutoRefreshToggle
                isAuto={isAutoRefresh}
                onToggle={handleAutoRefreshToggle}
                onRefresh={handleRefresh}
              />
            </div>
          </div>

          {/* Верхняя строка: TokenCard и Tooltip */}
          <div className="flex items-center gap-4 justify-start flex-wrap mb-6">
            {/* TokenCard - показываем всегда, даже если токен не выбран */}
            <TokenCard
              token={
                selectedTokenData || {
                  token: '—',
                  aExchange: '',
                  bExchange: '',
                  priceA: '',
                  priceB: '',
                  spread: '',
                  network: '',
                  limit: 'all',
                  address: '',
                }
              }
              reverseSpread={null}
              onEdit={handleTokenSelect}
            />
            {/* Tooltip контейнер для данных графика - справа от TokenCard */}
            {tooltipData && (
              <div className="flex items-center">
                <div className="flex items-center h-7 rounded border bg-white dark:bg-dark-800 border-light-300 dark:border-dark-700 shadow-sm">
                  {/* Время (HH:MM) - слева */}
                  <div className="px-2.5 h-full flex items-center justify-center border-r border-light-300 dark:border-dark-700">
                    <span className="text-xs sm:text-sm font-medium text-dark-950 dark:text-dark-50">
                      {(() => {
                        const date = new Date(tooltipData.timestamp);
                        const hours = String(date.getHours()).padStart(2, '0');
                        const minutes = String(date.getMinutes()).padStart(
                          2,
                          '0'
                        );
                        return `${hours}:${minutes}`;
                      })()}
                    </span>
                  </div>
                  {/* Зеленый спред (Direct Spread) */}
                  {tooltipData.directSpread !== null ? (
                    <div className="bg-green-500 dark:bg-green-600 px-2.5 min-w-[50px] h-full flex items-center justify-center text-center rounded-l">
                      <span className="text-white text-xs font-medium">
                        {tooltipData.directSpread.toFixed(2)}%
                      </span>
                    </div>
                  ) : (
                    <div className="bg-gray-400 dark:bg-gray-600 px-2.5 min-w-[50px] h-full flex items-center justify-center text-center rounded-l">
                      <span className="text-white text-xs font-medium">—</span>
                    </div>
                  )}
                  {/* Обратный спред (Reverse Spread) - справа */}
                  <div
                    className={cn(
                      'px-2.5 pr-3 min-w-[50px] h-full flex items-center justify-center text-center rounded-r',
                      tooltipData.reverseSpread !== null &&
                        !isNaN(tooltipData.reverseSpread) &&
                        tooltipData.reverseSpread < 0
                        ? 'bg-red-500 dark:bg-red-600'
                        : 'bg-gray-400 dark:bg-gray-600'
                    )}
                  >
                    <span className="text-white text-xs font-medium">
                      {tooltipData.reverseSpread !== null &&
                      !isNaN(tooltipData.reverseSpread)
                        ? `${tooltipData.reverseSpread.toFixed(2)}%`
                        : '—'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Средняя часть: двухколоночная сетка (График + Метрики/Таблица) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 items-start">
            {/* Левая колонка (2/3 ширины) - График */}
            <div className="lg:col-span-2">
              <SpreadChartPanel
                token={selectedToken}
                timeframe={timeframe}
                onTimeframeChange={setTimeframe}
                isOpen={true}
                onTooltipDataChange={setTooltipData}
              />
            </div>

            {/* Правая колонка (1/3 ширины) - MetricsCards с историей */}
            <div className="lg:col-span-1 flex flex-col">
              <MetricsCards
                currentSpread={metrics.currentSpread}
                averageSpread={metrics.averageSpread}
                maximum={metrics.maximum}
                spreadData={spreadData || null}
                source1={defaultSources.source1}
                source2={defaultSources.source2}
                token={selectedToken}
                timeframe={timeframe}
                className="flex-1 min-h-0"
              />
            </div>
          </div>

          {/* Состояния загрузки и ошибки */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {[...Array(6)].map((_, i) => (
                <TokenCardSkeleton key={i} />
              ))}
            </div>
          )}

          {error && (
            <ErrorDisplay
              error={error}
              onReset={() => {
                refetch();
              }}
              title={t('api.errors.loadTokens') || 'Error loading tokens'}
              showDetails={false}
            />
          )}

          {/* Избранные токены - дубликаты наверху */}
          {!isLoading && !error && favoriteTokensList.length > 0 && (
            <div className="mb-6 sm:mb-8">
              <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-900 dark:text-white">
                {t('tokens.favorites') || 'Favorites'}
              </h2>
              <TokenGrid
                tokens={favoriteTokensList}
                onEdit={handleTokenSelect}
                onFavoriteToggle={handleFavoriteToggle}
                isFavorite={isFavoriteCheck}
              />
            </div>
          )}

          {/* Нижняя часть: TokenGrid */}
          {!isLoading && !error && (
            <>
              {filteredTokens.length === 0 ? (
                <EmptyState
                  icon={tokens.length === 0 ? 'alert' : 'search'}
                  title={t('tokens.noTokens') || 'No tokens found'}
                  description={
                    tokens.length === 0
                      ? t('tokens.noTokensDescription') ||
                        'Unable to load tokens from the server. Please check your connection and try refreshing the page.'
                      : t('tokens.noTokensMatchFilters') ||
                        'No tokens match the current filters.'
                  }
                />
              ) : (
                <TokenGrid
                  tokens={filteredTokens}
                  onEdit={handleTokenSelect}
                  onFavoriteToggle={handleFavoriteToggle}
                  isFavorite={isFavoriteCheck}
                />
              )}
            </>
          )}
        </div>
      </Container>
    </div>
  );
}
