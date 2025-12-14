import { useState, useMemo, useCallback, useEffect } from 'react';
import { Container } from '@/components/layout/Container';
import { TokenSearch } from '@/components/features/tokens/TokenSearch';
import { TokenFilters } from '@/components/features/tokens/TokenFilters';
import { ExchangeIndicator } from '@/components/features/tokens/ExchangeIndicator';
import { TokenCard } from '@/components/features/tokens/TokenCard';
import { TokenCardSkeleton } from '@/components/features/tokens/TokenCardSkeleton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useTokens } from '@/api/hooks/useTokens';
import { useLanguage } from '@/contexts/LanguageContext';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

/**
 * Главная страница с токенами
 */
// Количество токенов для отображения за раз
const ITEMS_PER_PAGE = 24;

export function TokensPage() {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [minSpread, setMinSpread] = useState(0);
  const [showDirectOnly, setShowDirectOnly] = useState(false);
  const [showReverseOnly, setShowReverseOnly] = useState(false);
  const [displayedCount, setDisplayedCount] = useState(ITEMS_PER_PAGE);

  // Загружаем токены из API
  const { data: tokens = [], isLoading, error } = useTokens();

  const filteredTokens = useMemo(() => {
    let filtered = tokens;

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

    return filtered;
  }, [tokens, searchTerm, minSpread, showDirectOnly, showReverseOnly]);

  // Сбрасываем счетчик при изменении фильтров
  useEffect(() => {
    setDisplayedCount(ITEMS_PER_PAGE);
  }, [searchTerm, minSpread, showDirectOnly, showReverseOnly]);

  // Токены для отображения (с учетом пагинации)
  const displayedTokens = useMemo(() => {
    return filteredTokens.slice(0, displayedCount);
  }, [filteredTokens, displayedCount]);

  const hasMore = displayedCount < filteredTokens.length;

  // Загрузка следующей порции
  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      setDisplayedCount((prev) => prev + ITEMS_PER_PAGE);
    }
  }, [hasMore, isLoading]);

  // Infinite scroll observer
  const observerTarget = useInfiniteScroll({
    hasMore,
    isLoading,
    onLoadMore: loadMore,
    threshold: 300,
  });

  return (
    <div className="min-h-screen bg-white dark:bg-dark-900">
      <Container>
        <div className="max-w-7xl mx-auto py-4 sm:py-6 lg:py-8">
          {/* Поиск и фильтры */}
          <div className="mb-4 sm:mb-6 space-y-3 sm:space-y-4">
            {/* Поиск */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center">
              <div className="flex-1 w-full sm:max-w-md">
                <TokenSearch value={searchTerm} onChange={setSearchTerm} />
              </div>
              <div className="flex-1 sm:flex-initial">
                <TokenFilters
                  minSpread={minSpread}
                  onMinSpreadChange={setMinSpread}
                  showDirectOnly={showDirectOnly}
                  onDirectOnlyChange={setShowDirectOnly}
                  showReverseOnly={showReverseOnly}
                  onReverseOnlyChange={setShowReverseOnly}
                />
              </div>
            </div>

            {/* Индикатор обмена и счетчик */}
            <div className="flex items-center justify-between">
              <ExchangeIndicator sourceChain="bsc" targetExchange="MEXC" />
              <div className="text-sm sm:text-base font-medium text-light-600 dark:text-dark-400">
                {isLoading ? (
                  '...'
                ) : (
                  <>
                    {displayedTokens.length} / {filteredTokens.length}
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
                {error instanceof Error ? error.message : 'Please check console for details'}
              </p>
            </div>
          )}

          {/* Список токенов */}
          {!isLoading && !error && (
            <>
              {filteredTokens.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-light-500 dark:text-dark-500 text-sm">
                    {t('tokens.noTokens') || 'No tokens found'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {displayedTokens.map((tokenData) => (
                      <TokenCard
                        key={`${tokenData.symbol}-${tokenData.chain}`}
                        token={{ symbol: tokenData.symbol, chain: tokenData.chain }}
                        price={tokenData.price}
                        directSpread={tokenData.directSpread}
                        reverseSpread={tokenData.reverseSpread}
                      />
                    ))}
                  </div>

                  {/* Infinite scroll trigger и индикатор загрузки */}
                  {hasMore && (
                    <div
                      ref={observerTarget}
                      className="flex items-center justify-center py-8"
                    >
                      {isLoading ? (
                        <LoadingSpinner size="md" />
                      ) : (
                        <div className="text-center">
                          <p className="text-sm text-light-600 dark:text-dark-400 mb-2">
                            {t('tokens.scrollToLoad') || 'Scroll to load more...'}
                          </p>
                          <button
                            onClick={loadMore}
                            className="px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                          >
                            {t('tokens.loadMore') || 'Load More'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Индикатор конца списка */}
                  {!hasMore && displayedTokens.length > 0 && (
                    <div className="text-center py-8">
                      <p className="text-sm text-light-500 dark:text-dark-500">
                        {t('tokens.allLoaded') || 'All tokens loaded'} ({filteredTokens.length} {t('common.total') || 'total'})
                      </p>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </Container>
    </div>
  );
}



