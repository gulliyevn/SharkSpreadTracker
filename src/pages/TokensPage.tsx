import { useState, useMemo, useCallback, useEffect } from 'react';
import { Container } from '@/components/layout/Container';
import { TokenSearch } from '@/components/features/tokens/TokenSearch';
import { TokenFilters } from '@/components/features/tokens/TokenFilters';
import { TokenSelector } from '@/components/features/tokens/TokenSelector';
import {
  ChainFilter,
  type ChainFilterValue,
} from '@/components/features/tokens/ChainFilter';
import {
  SortSelector,
  type SortOption,
} from '@/components/features/tokens/SortSelector';
import { ExchangeIndicator } from '@/components/features/tokens/ExchangeIndicator';
import { TokenCardSkeleton } from '@/components/features/tokens/TokenCardSkeleton';
import { TokenGrid } from '@/components/features/tokens/TokenGrid';
import { TokenDetailsModal } from '@/components/features/tokens/TokenDetailsModal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useTokensWithSpreads } from '@/api/hooks/useTokensWithSpreads';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  analytics,
  trackTokenFilter,
  trackTokenSelected,
} from '@/lib/analytics';
import type { Token } from '@/types';

/**
 * Главная страница с токенами
 */

export function TokensPage() {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [minSpread, setMinSpread] = useState(0);
  const [showDirectOnly, setShowDirectOnly] = useState(false);
  const [showReverseOnly, setShowReverseOnly] = useState(false);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [chainFilter, setChainFilter] = useState<ChainFilterValue>('all');
  const [editingToken, setEditingToken] = useState<Token | null>(null);

  // Загружаем настройки сортировки из localStorage
  const [sortOption, setSortOption] = useState<SortOption>(() => {
    const saved = localStorage.getItem('token-sort-option');
    return saved === 'spread' || saved === 'name' || saved === 'price'
      ? saved
      : 'spread';
  });

  // Загружаем токены из API с ценами и спредами (постепенно)
  const { data: tokens = [], isLoading, error, loadedCount, totalCount } = useTokensWithSpreads();

  // Уникальные токены для селектора (убираем дубликаты по symbol-chain)
  const uniqueTokensForSelector = useMemo(() => {
    const tokenMap = new Map<string, Token>();
    tokens.forEach((token) => {
      const key = `${token.symbol}-${token.chain}`;
      if (!tokenMap.has(key)) {
        tokenMap.set(key, { symbol: token.symbol, chain: token.chain });
      }
    });
    return Array.from(tokenMap.values()).sort((a, b) =>
      a.symbol.localeCompare(b.symbol)
    );
  }, [tokens]);

  // Подсчет токенов по chain
  const chainCounts = useMemo(() => {
    const counts = {
      all: tokens.length,
      solana: tokens.filter((t) => t.chain === 'solana').length,
      bsc: tokens.filter((t) => t.chain === 'bsc').length,
    };
    return counts;
  }, [tokens]);

  const filteredTokens = useMemo(() => {
    let filtered = tokens;

    // Фильтр по chain
    if (chainFilter !== 'all') {
      filtered = filtered.filter((token) => token.chain === chainFilter);
    }

    // Фильтр по поиску
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((token) =>
        token.symbol.toLowerCase().includes(searchLower)
      );
    }

    // Фильтр по минимальному спреду
    if (minSpread > 0) {
      filtered = filtered.filter((token) => {
        const maxSpread = Math.max(
          token.directSpread || 0,
          token.reverseSpread || 0
        );
        return maxSpread >= minSpread;
      });
    }

    // Фильтр по направлению
    if (showDirectOnly) {
      filtered = filtered.filter((token) => (token.directSpread || 0) > 0);
    }
    if (showReverseOnly) {
      filtered = filtered.filter((token) => (token.reverseSpread || 0) > 0);
    }

    // Сортировка в зависимости от выбранной опции
    filtered.sort((a, b) => {
      if (sortOption === 'spread') {
        // Сортировка по спреду (по убыванию)
        const spreadA = Math.max(a.directSpread || 0, a.reverseSpread || 0);
        const spreadB = Math.max(b.directSpread || 0, b.reverseSpread || 0);

        if (spreadB !== spreadA) {
          return spreadB - spreadA;
        }

        // Вторичная сортировка: по алфавиту
        return a.symbol.localeCompare(b.symbol);
      } else if (sortOption === 'name') {
        // Сортировка по имени (по алфавиту)
        return a.symbol.localeCompare(b.symbol);
      } else if (sortOption === 'price') {
        // Сортировка по цене (по убыванию)
        const priceA = a.price || 0;
        const priceB = b.price || 0;

        if (priceB !== priceA) {
          return priceB - priceA;
        }

        // Вторичная сортировка: по алфавиту
        return a.symbol.localeCompare(b.symbol);
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

  // Мемоизированные обработчики для предотвращения лишних ререндеров
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    if (value) {
      trackTokenFilter('search', value);
    }
  }, []);

  const handleMinSpreadChange = useCallback((value: number) => {
    setMinSpread(value);
    if (value > 0) {
      trackTokenFilter('minSpread', value);
    }
  }, []);

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

  const handleTokenSelect = useCallback((token: Token) => {
    setSelectedToken(token);
    trackTokenSelected(token.symbol, token.chain);
  }, []);

  const handleTokenClear = useCallback(() => {
    setSelectedToken(null);
  }, []);

  const handleTokenEdit = useCallback((token: Token) => {
    setEditingToken(token);
    trackTokenSelected(token.symbol, token.chain);
  }, []);

  const handleCloseModal = useCallback(() => {
    setEditingToken(null);
  }, []);

  // Получаем данные для редактируемого токена
  const editingTokenData = useMemo(() => {
    if (!editingToken) return null;
    return (
      filteredTokens.find(
        (t) =>
          t.symbol === editingToken.symbol && t.chain === editingToken.chain
      ) || null
    );
  }, [editingToken, filteredTokens]);

  const handleChainFilterChange = useCallback((value: ChainFilterValue) => {
    setChainFilter(value);
    trackTokenFilter('chain', value);
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-dark-900">
      <Container>
        <div className="max-w-7xl mx-auto py-4 sm:py-6 lg:py-8">
          {/* Поиск и фильтры */}
          <div className="mb-4 sm:mb-6 space-y-3 sm:space-y-4">
            {/* Выбор токена */}
            <div className="flex items-center gap-3">
              <div className="text-sm font-medium text-light-700 dark:text-dark-300 whitespace-nowrap">
                {t('tokens.selectedToken') || 'Selected Token:'}
              </div>
              <div className="flex-1 max-w-xs">
                <TokenSelector
                  tokens={uniqueTokensForSelector}
                  value={selectedToken}
                  onSelect={handleTokenSelect}
                  onClear={handleTokenClear}
                  placeholder={t('tokens.selectToken') || 'Select a token...'}
                  showChain
                />
              </div>
            </div>

            {/* Chain Filter */}
            <div className="flex items-center gap-3">
              <div className="text-sm font-medium text-light-700 dark:text-dark-300 whitespace-nowrap">
                Chain:
              </div>
              <ChainFilter
                value={chainFilter}
                onChange={handleChainFilterChange}
                counts={chainCounts}
              />
            </div>

            {/* Поиск */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center">
              <div className="flex-1 w-full sm:max-w-md">
                <TokenSearch value={searchTerm} onChange={handleSearchChange} />
              </div>
              <div className="flex-1 sm:flex-initial">
                <TokenFilters
                  minSpread={minSpread}
                  onMinSpreadChange={handleMinSpreadChange}
                  showDirectOnly={showDirectOnly}
                  onDirectOnlyChange={handleDirectOnlyChange}
                  showReverseOnly={showReverseOnly}
                  onReverseOnlyChange={handleReverseOnlyChange}
                />
              </div>
            </div>

            {/* Сортировка */}
            <div className="flex items-center gap-3">
              <div className="text-sm font-medium text-light-700 dark:text-dark-300 whitespace-nowrap">
                Sort:
              </div>
              <SortSelector value={sortOption} onChange={handleSortChange} />
            </div>

            {/* Индикатор обмена и счетчик */}
            <div className="flex items-center justify-between">
              <ExchangeIndicator sourceChain="bsc" targetExchange="MEXC" />
              <div className="text-sm sm:text-base font-medium text-light-600 dark:text-dark-400">
                {isLoading ? (
                  '...'
                ) : (
                  <>
                    {filteredTokens.length} {t('common.total') || 'total'}
                    {loadedCount > 0 && loadedCount < totalCount && (
                      <span className="ml-2 text-xs text-light-500 dark:text-dark-500">
                        ({loadedCount}/{totalCount} loaded)
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Состояния загрузки и ошибки */}
          {isLoading && (
            <div className="space-y-4">
              <div className="flex items-center justify-center py-4">
                <LoadingSpinner size="md" />
                <span className="ml-3 text-light-600 dark:text-dark-400">
                  {t('common.loading') || 'Loading tokens...'}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {[...Array(6)].map((_, i) => (
                  <TokenCardSkeleton key={i} />
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-error-600 dark:text-error-400 mb-2">
                {t('api.errors.unknown') || 'Error loading tokens'}
              </p>
              <p className="text-xs text-light-500 dark:text-dark-500">
                {error instanceof Error
                  ? error.message
                  : 'Please check console for details'}
              </p>
            </div>
          )}

          {/* Список токенов */}
          {!isLoading && !error && (
            <>
              {filteredTokens.length === 0 ? (
                <EmptyState
                  icon="search"
                  title={t('tokens.noTokens') || 'No tokens found'}
                  description={
                    searchTerm
                      ? t('tokens.noTokensWithSearch') ||
                        `No tokens match "${searchTerm}"`
                      : t('tokens.noTokensDescription') ||
                        'Try adjusting your filters or search query'
                  }
                />
              ) : (
                // Адаптивная сетка токенов - показывает ВСЕ токены без ограничений
                <div className="w-full">
                  <TokenGrid tokens={filteredTokens} onEdit={handleTokenEdit} />
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
          price={editingTokenData.price}
          directSpread={editingTokenData.directSpread}
          reverseSpread={editingTokenData.reverseSpread}
        />
      )}
    </div>
  );
}
