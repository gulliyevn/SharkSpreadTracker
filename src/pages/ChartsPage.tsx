import { useState, useMemo, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Container } from '@/components/layout/Container';
import {
  ChainFilter,
  type ChainFilterValue,
} from '@/components/features/tokens/ChainFilter';
import { ChartsLayout } from '@/components/features/spreads/ChartsLayout';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import { ChartsLayoutSkeleton } from '@/components/features/spreads/ChartsLayoutSkeleton';
import { useTokens } from '@/api/hooks/useTokens';

/**
 * Страница с графиками спреда
 */
export function ChartsPage() {
  const { t } = useLanguage();
  const [chainFilter, setChainFilter] = useState<ChainFilterValue>('all');
  const { data: tokens = [], isLoading, error, refetch } = useTokens();

  // Фильтруем токены по chain
  const filteredTokens = useMemo(() => {
    if (chainFilter === 'all') {
      return tokens;
    }
    return tokens.filter((row) => {
      const network = (row.network || '').toLowerCase();
      if (chainFilter === 'bsc') {
        return network === 'bsc' || network === 'bep20';
      }
      return network !== 'bsc' && network !== 'bep20';
    });
  }, [tokens, chainFilter]);

  // Подсчет токенов по chain
  const chainCounts = useMemo(() => {
    const counts = {
      all: tokens.length,
      solana: tokens.filter((row) => {
        const network = (row.network || '').toLowerCase();
        return network !== 'bsc' && network !== 'bep20';
      }).length,
      bsc: tokens.filter((row) => {
        const network = (row.network || '').toLowerCase();
        return network === 'bsc' || network === 'bep20';
      }).length,
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
            <ChartsLayoutSkeleton />
          ) : error ? (
            <ErrorDisplay
              error={error}
              onReset={() => {
                refetch();
              }}
              title={t('api.errors.loadTokens') || 'Error loading tokens'}
              showDetails={false}
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
