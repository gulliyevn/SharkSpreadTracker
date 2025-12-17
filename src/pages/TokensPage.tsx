import { useState, useMemo, useCallback, useEffect } from 'react';
import { Container } from '@/components/layout/Container';
import { TokenSearch } from '@/components/features/tokens/TokenSearch';
import { TokenFilters } from '@/components/features/tokens/TokenFilters';
import { TokenSelector } from '@/components/features/tokens/TokenSelector';
import { ExchangeIndicator } from '@/components/features/tokens/ExchangeIndicator';
import { TokenCardSkeleton } from '@/components/features/tokens/TokenCardSkeleton';
import { TokenGrid } from '@/components/features/tokens/TokenGrid';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useTokens } from '@/api/hooks/useTokens';
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

  // Загружаем токены из API
  const { data: tokens = [], isLoading, error } = useTokens();

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

  const handleTokenSelect = useCallback((token: Token) => {
    setSelectedToken(token);
    trackTokenSelected(token.symbol, token.chain);
  }, []);

  const handleTokenClear = useCallback(() => {
    setSelectedToken(null);
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

            {/* Индикатор обмена и счетчик */}
            <div className="flex items-center justify-between">
              <ExchangeIndicator sourceChain="bsc" targetExchange="MEXC" />
              <div className="text-sm sm:text-base font-medium text-light-600 dark:text-dark-400">
                {isLoading ? (
                  '...'
                ) : (
                  <>
                    {filteredTokens.length} {t('common.total') || 'total'}
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
                  <TokenGrid tokens={filteredTokens} />
                </div>
              )}
            </>
          )}
        </div>
      </Container>
    </div>
  );
}
