import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  TrendingUp,
  ArrowUpAZ,
  DollarSign,
  Layers,
  ArrowRightCircle,
  ArrowLeftCircle,
} from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { useSearch } from '@/contexts/SearchContext';
import { useMinSpread } from '@/contexts/MinSpreadContext';
import { cn } from '@/utils/cn';
import {
  ChainFilter,
  type ChainFilterValue,
} from '@/components/features/tokens/ChainFilter';
import type { SortOption } from '@/components/features/tokens/SortSelector';
import { Progress } from '@/components/ui/Progress';
import { TokenCardSkeleton } from '@/components/features/tokens/TokenCardSkeleton';
import { TokenGrid } from '@/components/features/tokens/TokenGrid';
import { TokenDetailsModal } from '@/components/features/tokens/TokenDetailsModal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import { AutoRefreshToggle } from '@/components/features/spreads/AutoRefreshToggle';
import { useTokensWithSpreads } from '@/api/hooks/useTokensWithSpreads';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  analytics,
  trackTokenFilter,
  trackTokenSelected,
} from '@/lib/analytics';
import type { Token, StraightData } from '@/types';
import { STORAGE_KEYS } from '@/constants/api';

/**
 * Функция для создания уникального ключа токена (token-network)
 */
function getTokenKey(token: StraightData): string {
  return `${(token.token || '').toUpperCase().trim()}-${(token.network || '').toLowerCase()}`;
}

/**
 * Главная страница с токенами
 */

export function TokensPage() {
  const { t } = useLanguage();
  const { searchTerm } = useSearch();
  const { minSpread, setMinSpread } = useMinSpread();
  const [showDirectOnly, setShowDirectOnly] = useState(false);
  const [showReverseOnly, setShowReverseOnly] = useState(false);
  const [chainFilter, setChainFilter] = useState<ChainFilterValue>('all');
  const [editingToken, setEditingToken] = useState<Token | null>(null);

  // Загружаем настройки сортировки из localStorage
  const [sortOption, setSortOption] = useState<SortOption>(() => {
    const saved = localStorage.getItem('token-sort-option');
    return saved === 'spread' || saved === 'name' || saved === 'price'
      ? saved
      : 'spread';
  });

  // Автообновление токенов
  const [isAutoRefresh, setIsAutoRefresh] = useState(() => {
    const saved = localStorage.getItem('tokens-auto-refresh');
    return saved === 'true'; // По умолчанию выключено, только при явном включении кнопки Auto
  });

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

  // Загружаем токены из API с ценами и спредами (постепенно)
  const {
    data: tokens = [],
    isLoading,
    error,
    loadedCount,
    totalCount,
    refetch,
  } = useTokensWithSpreads();

  // Подсчет токенов по chain (с дедупликацией)
  const chainCounts = useMemo(() => {
    // Дедупликация токенов по token+network (такая же как в filteredTokens)
    const uniqueMap = new Map<string, StraightData>();
    for (const token of tokens) {
      const key = `${(token.token || '').toUpperCase().trim()}-${(token.network || '').toLowerCase()}`;
      uniqueMap.set(key, token); // Последний токен перезапишет предыдущий
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

  const filteredTokens = useMemo(() => {
    // Дедупликация токенов по token+network (оставляем последний по времени)
    // Используем Map для уникальности по ключу "token-network"
    const uniqueMap = new Map<string, StraightData>();
    for (const token of tokens) {
      const key = getTokenKey(token);
      uniqueMap.set(key, token); // Последний токен перезапишет предыдущий
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

    // Фильтр по поиску
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((row) =>
        (row.token || '').toLowerCase().includes(searchLower)
      );
    }

    // Фильтр по минимальному спреду
    if (minSpread > 0) {
      filtered = filtered.filter((row) => {
        const spread = row.spread ? Number(row.spread) : null;
        return spread != null && spread >= minSpread;
      });
    }

    // Фильтр по направлению
    if (showDirectOnly) {
      filtered = filtered.filter((row) => {
        const spread = row.spread ? Number(row.spread) : null;
        return spread != null && spread > 0;
      });
    }
    if (showReverseOnly) {
      // reverseSpread всегда null до реализации /socket/sharkReverse на бэкенде, поэтому этот фильтр не сработает
      filtered = filtered.filter(() => false);
    }

    // Сортировка в зависимости от выбранной опции
    filtered.sort((a, b) => {
      const symbolA = (a.token || '').toUpperCase().trim();
      const symbolB = (b.token || '').toUpperCase().trim();

      if (sortOption === 'spread') {
        // Сортировка по спреду (по убыванию)
        const spreadA = a.spread ? Number(a.spread) : 0;
        const spreadB = b.spread ? Number(b.spread) : 0;

        if (spreadB !== spreadA) {
          return spreadB - spreadA;
        }

        // Вторичная сортировка: по алфавиту
        return symbolA.localeCompare(symbolB);
      } else if (sortOption === 'name') {
        // Сортировка по имени (по алфавиту)
        return symbolA.localeCompare(symbolB);
      } else if (sortOption === 'price') {
        // Сортировка по цене (по убыванию) - берем среднее из priceA и priceB
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

        // Вторичная сортировка: по алфавиту
        return symbolA.localeCompare(symbolB);
      }

      return 0;
    });

    return filtered;
  }, [
    tokens,
    chainFilter,
    searchTerm,
    minSpread,
    showDirectOnly,
    showReverseOnly,
    sortOption,
  ]);

  // Трекинг просмотра страницы
  useEffect(() => {
    analytics.pageView('tokens');
  }, []);

  // Сохраняем настройку автообновления
  useEffect(() => {
    localStorage.setItem('tokens-auto-refresh', String(isAutoRefresh));
  }, [isAutoRefresh]);

  // Автообновление данных
  useEffect(() => {
    if (!isAutoRefresh) return;

    const interval = setInterval(() => {
      refetch();
    }, 3000); // Обновляем каждые 3 секунды

    return () => clearInterval(interval);
  }, [isAutoRefresh, refetch]);

  // Мемоизированные обработчики для предотвращения лишних ререндеров
  // Поиск теперь управляется через SearchContext в Header

  const handleMinSpreadChange = useCallback(
    (value: number) => {
      setMinSpread(value);
      if (value > 0) {
        trackTokenFilter('minSpread', value);
      }
    },
    [setMinSpread]
  );

  const handleMinSpreadInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      // Разрешаем пустое значение
      if (inputValue === '') {
        setMinSpread(0);
        return;
      }
      const value = parseFloat(inputValue);
      if (!isNaN(value) && value >= 0) {
        handleMinSpreadChange(value);
      }
    },
    [setMinSpread, handleMinSpreadChange]
  );

  const handleDirectOnlyChange = useCallback((value: boolean) => {
    setShowDirectOnly(value);
    if (value) {
      trackTokenFilter('directOnly', true);
    }
  }, []);

  const handleReverseOnlyChange = useCallback((value: boolean) => {
    setShowReverseOnly(value);
    if (value) {
      trackTokenFilter('reverseOnly', true);
    }
  }, []);

  const handleSortChange = useCallback((value: SortOption) => {
    setSortOption(value);
    localStorage.setItem('token-sort-option', value);
    trackTokenFilter('sort', value);
  }, []);

  const handleSortClick = useCallback(() => {
    // Циклическое переключение: spread → name → price → spread
    if (sortOption === 'spread') {
      handleSortChange('name');
    } else if (sortOption === 'name') {
      handleSortChange('price');
    } else {
      handleSortChange('spread');
    }
  }, [sortOption, handleSortChange]);

  const getSortIcon = () => {
    if (sortOption === 'spread') {
      return <TrendingUp className="h-4 w-4" />;
    } else if (sortOption === 'name') {
      return <ArrowUpAZ className="h-4 w-4" />;
    } else {
      return <DollarSign className="h-4 w-4" />;
    }
  };

  const handleAutoRefreshToggle = useCallback((isAuto: boolean) => {
    setIsAutoRefresh(isAuto);
  }, []);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleTokenEdit = useCallback((token: StraightData) => {
    const network = (token.network || '').toLowerCase();
    const chain: 'solana' | 'bsc' =
      network === 'bsc' || network === 'bep20' ? 'bsc' : 'solana';
    const symbol = (token.token || '').toUpperCase().trim();
    setEditingToken({ symbol, chain });
    trackTokenSelected(symbol, chain);
  }, []);

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

  const handleCloseModal = useCallback(() => {
    setEditingToken(null);
  }, []);

  // Получаем данные для редактируемого токена
  const editingTokenData = useMemo(() => {
    if (!editingToken) return null;
    return (
      filteredTokens.find(
        (row) =>
          (row.token || '').toUpperCase().trim() ===
            editingToken.symbol.toUpperCase() &&
          ((row.network || '').toLowerCase() === editingToken.chain ||
            (editingToken.chain === 'bsc' &&
              (row.network || '').toLowerCase() === 'bep20'))
      ) || null
    );
  }, [editingToken, filteredTokens]);

  const handleChainFilterChange = useCallback((value: ChainFilterValue) => {
    setChainFilter(value);
    trackTokenFilter('chain', value);
  }, []);

  // Функция для проверки, является ли токен избранным
  const isFavoriteCheck = useCallback(
    (token: StraightData) => {
      const tokenKey = getTokenKey(token);
      return favoriteTokens.has(tokenKey);
    },
    [favoriteTokens]
  );

  return (
    <div className="min-h-screen bg-white dark:bg-dark-900">
      <Container>
        <div className="max-w-7xl mx-auto py-4 sm:py-6 lg:py-8">
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
                    // All → Direct
                    handleDirectOnlyChange(true);
                    handleReverseOnlyChange(false);
                  } else if (showDirectOnly && !showReverseOnly) {
                    // Direct → Reverse
                    handleDirectOnlyChange(false);
                    handleReverseOnlyChange(true);
                  } else {
                    // Reverse → All
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
                    <span>{t('filters.all')}</span>
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
                  {t('filters.minSpread')}
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

              {/* Счетчик / Loading */}
              <div className="ml-auto flex items-center">
                {isLoading ? (
                  <LoadingSpinner size="sm" />
                ) : loadedCount > 0 && loadedCount < totalCount ? (
                  <Progress
                    value={loadedCount}
                    max={totalCount}
                    size="sm"
                    showLabel
                    label={`${loadedCount}/${totalCount}`}
                    variant="primary"
                  />
                ) : (
                  <div className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-400">
                    {filteredTokens.length}
                  </div>
                )}
              </div>
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
                onEdit={handleTokenEdit}
                onFavoriteToggle={handleFavoriteToggle}
                isFavorite={isFavoriteCheck}
              />
            </div>
          )}

          {/* Список токенов */}
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
                      : searchTerm
                        ? t('tokens.noTokensWithSearch') ||
                          `No tokens match "${searchTerm}"`
                        : t('tokens.noTokensDescription') ||
                          'Try adjusting your filters or search query'
                  }
                  action={
                    tokens.length === 0 ? (
                      <button
                        onClick={() => refetch()}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                      >
                        {t('common.refresh') || 'Refresh'}
                      </button>
                    ) : undefined
                  }
                />
              ) : (
                // Адаптивная сетка токенов - показывает ВСЕ токены без ограничений
                <div className="w-full">
                  <TokenGrid
                    tokens={filteredTokens}
                    onEdit={handleTokenEdit}
                    onFavoriteToggle={handleFavoriteToggle}
                    isFavorite={isFavoriteCheck}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </Container>

      {/* Модальное окно с деталями токена */}
      {editingToken && editingTokenData && (
        <TokenDetailsModal
          isOpen={editingToken !== null}
          onClose={handleCloseModal}
          token={editingToken}
          tokenData={editingTokenData}
          reverseSpread={null}
        />
      )}
    </div>
  );
}
