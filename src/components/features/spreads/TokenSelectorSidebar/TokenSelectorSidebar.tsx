import { useState, useMemo, useCallback, useRef } from 'react';
import { Search } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/utils/cn';
import type { Token } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';

export interface TokenSelectorSidebarProps {
  tokens: Token[];
  value?: Token | null;
  onSelect: (token: Token) => void;
  className?: string;
}

/**
 * Компактный селектор токенов для боковой панели ChartsPage
 * С поиском и прокручиваемым списком токенов
 */
export function TokenSelectorSidebar({
  tokens,
  value,
  onSelect,
  className,
}: TokenSelectorSidebarProps) {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Фильтруем токены по поисковому запросу
  const filteredTokens = useMemo(() => {
    if (!searchTerm.trim()) {
      return tokens;
    }
    const searchLower = searchTerm.toLowerCase();
    return tokens.filter((token) =>
      token.symbol.toLowerCase().includes(searchLower)
    );
  }, [tokens, searchTerm]);

  const handleSelect = useCallback(
    (token: Token) => {
      onSelect(token);
      setSearchTerm('');
    },
    [onSelect]
  );

  const getChainIcon = (chain: Token['chain']) => {
    return chain === 'solana' ? '◎' : '◉';
  };

  const getChainLabel = (chain: Token['chain']) => {
    return t(`chains.${chain}`) || chain.toUpperCase();
  };

  return (
    <Card className={cn('p-4', className)}>
      <h3 className="text-sm font-semibold mb-3 text-dark-950 dark:text-dark-50">
        {t('tokens.selectToken') || 'Select Token'}
      </h3>

      {/* Поиск */}
      <div className="relative mb-4">
        <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-500" />
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t('common.search') || 'Search tokens...'}
          className={cn(
            'w-full pl-9 pr-3 py-2 text-sm rounded-lg border transition-colors',
            'bg-white dark:bg-dark-900',
            'border-light-300 dark:border-dark-700',
            'text-gray-900 dark:text-gray-50',
            'placeholder:text-gray-400 dark:placeholder:text-gray-500',
            'focus:outline-none'
          )}
        />
      </div>

      {/* Список токенов */}
      <div className="max-h-[400px] overflow-y-auto">
        {filteredTokens.length === 0 ? (
          <div className="px-3 py-4 text-sm text-center text-gray-500 dark:text-gray-500">
            {t('common.noData') || 'No tokens found'}
          </div>
        ) : (
          <ul className="space-y-1">
            {filteredTokens.map((token) => {
              const isSelected =
                value?.symbol === token.symbol && value?.chain === token.chain;

              return (
                <li key={`${token.symbol}-${token.chain}`}>
                  <button
                    onClick={() => handleSelect(token)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                      'text-left',
                      isSelected
                        ? 'bg-primary-500 text-white font-medium'
                        : 'bg-light-100 dark:bg-dark-800 text-dark-950 dark:text-dark-50 hover:bg-light-200 dark:hover:bg-dark-700'
                    )}
                  >
                    {/* Иконка chain */}
                    <span className="text-base flex-shrink-0">
                      {getChainIcon(token.chain)}
                    </span>

                    {/* Символ токена */}
                    <span className="flex-1 truncate font-medium">
                      {token.symbol}
                    </span>

                    {/* Chain label */}
                    <span className="text-xs opacity-70 flex-shrink-0">
                      {getChainLabel(token.chain)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}
