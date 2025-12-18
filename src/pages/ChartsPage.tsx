import { useState, useMemo, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Container } from '@/components/layout/Container';
import {
  ChainFilter,
  type ChainFilterValue,
} from '@/components/features/tokens/ChainFilter';
import { ChartsLayout } from '@/components/features/spreads/ChartsLayout';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useTokens } from '@/api/hooks/useTokens';

/**
 * Страница с графиками спреда
 */
export function ChartsPage() {
  const { t } = useLanguage();
  const [chainFilter, setChainFilter] = useState<ChainFilterValue>('all');
  const { data: tokens = [], isLoading, error } = useTokens();

  // Фильтруем токены по chain
  const filteredTokens = useMemo(() => {
    if (chainFilter === 'all') {
      return tokens;
    }
    return tokens.filter((token) => token.chain === chainFilter);
  }, [tokens, chainFilter]);

  // Подсчет токенов по chain
  const chainCounts = useMemo(() => {
    const counts = {
      all: tokens.length,
      solana: tokens.filter((t) => t.chain === 'solana').length,
      bsc: tokens.filter((t) => t.chain === 'bsc').length,
    };
    return counts;
  }, [tokens]);

  const handleChainFilterChange = useCallback((value: ChainFilterValue) => {
    setChainFilter(value);
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-dark-900">
      <Container>
        <div className="max-w-7xl mx-auto py-6 sm:py-8">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 text-dark-950 dark:text-dark-50">
              {t('charts.title') || 'Charts'}
            </h1>
            <p className="text-sm sm:text-base text-light-600 dark:text-dark-400 mb-4">
              {t('charts.description') ||
                'View spread charts and analyze trading opportunities'}
            </p>
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
          </div>

          {/* Charts Layout */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="md" />
              <span className="ml-3 text-light-600 dark:text-dark-400">
                {t('common.loading') || 'Loading tokens...'}
              </span>
            </div>
          ) : error ? (
            <EmptyState
              icon="alert-circle"
              title={t('api.errors.unknown') || 'Error loading tokens'}
              description={
                error instanceof Error
                  ? error.message
                  : 'Please check console for details'
              }
            />
          ) : filteredTokens.length === 0 ? (
            <EmptyState
              icon="search"
              title={t('tokens.noTokens') || 'No tokens found'}
              description={
                t('tokens.noTokensDescription') ||
                'Try selecting a different chain'
              }
            />
          ) : (
            <ChartsLayout tokens={filteredTokens} />
          )}
        </div>
      </Container>
    </div>
  );
}
