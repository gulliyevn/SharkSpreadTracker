import { useState, useMemo } from 'react';
import { Container } from '@/components/layout/Container';
import { TokenSearch } from '@/components/features/tokens/TokenSearch';
import { TokenFilters } from '@/components/features/tokens/TokenFilters';
import { ExchangeIndicator } from '@/components/features/tokens/ExchangeIndicator';
import { TokenCard } from '@/components/features/tokens/TokenCard';
import { useTokens } from '@/api/hooks/useTokens';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Главная страница с токенами
 */
export function TokensPage() {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [minSpread, setMinSpread] = useState(0);
  const [showDirectOnly, setShowDirectOnly] = useState(false);
  const [showReverseOnly, setShowReverseOnly] = useState(false);

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
                {isLoading ? '...' : filteredTokens.length}
              </div>
            </div>
          </div>

          {/* Состояния загрузки и ошибки */}
          {isLoading && (
            <div className="text-center py-12">
              <p className="text-light-600 dark:text-dark-400">
                {t('common.loading') || 'Loading tokens...'}
              </p>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-error-600 dark:text-error-400">
                {t('api.errors.unknown') || 'Error loading tokens'}
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {filteredTokens.map((tokenData) => (
                    <TokenCard
                      key={`${tokenData.symbol}-${tokenData.chain}`}
                      token={{ symbol: tokenData.symbol, chain: tokenData.chain }}
                      price={tokenData.price}
                      directSpread={tokenData.directSpread}
                      reverseSpread={tokenData.reverseSpread}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </Container>
    </div>
  );
}



