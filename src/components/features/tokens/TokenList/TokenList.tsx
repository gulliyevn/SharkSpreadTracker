import { useMemo } from 'react';
import { TokenCard } from '../TokenCard';
import type { Token } from '@/types';

interface TokenListProps {
  tokens: Token[];
  searchTerm?: string;
  minSpread?: number;
  showDirectOnly?: boolean;
  showReverseOnly?: boolean;
}

/**
 * Список токенов в сетке
 */
export function TokenList({
  tokens,
  searchTerm = '',
  minSpread: _minSpread = 0,
  showDirectOnly: _showDirectOnly = false,
  showReverseOnly: _showReverseOnly = false,
}: TokenListProps) {
  const filteredTokens = useMemo(() => {
    let filtered = tokens;

    // Фильтр по поиску
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((token) =>
        token.symbol.toLowerCase().includes(searchLower)
      );
    }

    // TODO: Фильтры по спреду и направлению будут добавлены когда будут данные
    // minSpread, showDirectOnly, showReverseOnly будут использованы позже

    return filtered;
  }, [tokens, searchTerm]);

  if (filteredTokens.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-light-500 dark:text-dark-500 text-sm">
          No tokens found
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      {filteredTokens.map((token) => (
        <TokenCard key={`${token.symbol}-${token.chain}`} token={token} />
      ))}
    </div>
  );
}
