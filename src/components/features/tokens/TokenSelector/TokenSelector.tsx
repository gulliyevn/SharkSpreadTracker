import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { Token } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';

export interface TokenSelectorProps {
  tokens: Token[];
  value?: Token | null;
  onSelect: (token: Token) => void;
  onClear?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showChain?: boolean;
}

/**
 * Компонент выбора токена с поиском и клавиатурной навигацией
 */
export function TokenSelector({
  tokens,
  value,
  onSelect,
  onClear,
  placeholder,
  disabled = false,
  className,
  showChain = true,
}: TokenSelectorProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

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

  // Сбрасываем highlightedIndex при изменении списка
  useEffect(() => {
    if (filteredTokens.length > 0) {
      setHighlightedIndex(0);
    }
  }, [filteredTokens.length]);

  // Закрываем dropdown при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  // Фокус на input при открытии
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Прокрутка к highlighted элементу
  useEffect(() => {
    if (isOpen && listRef.current && highlightedIndex >= 0) {
      const items = listRef.current.children;
      const item = items[highlightedIndex] as HTMLElement;
      if (item && typeof item.scrollIntoView === 'function') {
        item.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = useCallback(
    (token: Token) => {
      onSelect(token);
      setIsOpen(false);
      setSearchTerm('');
      setHighlightedIndex(0);
    },
    [onSelect]
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onClear) {
        onClear();
      }
      setSearchTerm('');
    },
    [onClear]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      switch (e.key) {
        case 'Enter':
          e.preventDefault();
          if (isOpen && filteredTokens[highlightedIndex]) {
            handleSelect(filteredTokens[highlightedIndex]);
          } else if (!isOpen) {
            setIsOpen(true);
          }
          break;

        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          setSearchTerm('');
          break;

        case 'ArrowDown':
          e.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else {
            setHighlightedIndex((prev) =>
              prev < filteredTokens.length - 1 ? prev + 1 : prev
            );
          }
          break;

        case 'ArrowUp':
          e.preventDefault();
          if (isOpen) {
            setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
          }
          break;

        case 'Tab':
          if (isOpen) {
            setIsOpen(false);
            setSearchTerm('');
          }
          break;

        default:
          if (!isOpen && e.key.length === 1) {
            setIsOpen(true);
          }
          break;
      }
    },
    [disabled, isOpen, filteredTokens, highlightedIndex, handleSelect]
  );

  const getChainIcon = (chain: Token['chain']) => {
    return chain === 'solana' ? '◎' : '◉';
  };

  const getChainLabel = (chain: Token['chain']) => {
    return t(`chains.${chain}`) || chain.toUpperCase();
  };

  const displayValue = value
    ? `${value.symbol}${showChain ? ` (${getChainLabel(value.chain)})` : ''}`
    : '';

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {/* Триггер кнопка */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between gap-2',
          'px-3 py-2.5 rounded-lg border transition-all duration-200',
          'bg-light-50 dark:bg-dark-800',
          'border-light-300 dark:border-dark-700',
          'text-dark-950 dark:text-dark-50',
          'hover:border-primary-500 dark:hover:border-primary-500',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
          disabled &&
            'opacity-50 cursor-not-allowed hover:border-light-300 dark:hover:border-dark-700',
          isOpen &&
            'ring-2 ring-primary-500 border-primary-500 dark:border-primary-500'
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={placeholder || t('common.select') || 'Select token'}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {value ? (
            <>
              <span className="text-sm font-medium truncate">
                {displayValue}
              </span>
              {onClear && (
                <button
                  type="button"
                  onClick={handleClear}
                  className={cn(
                    'flex-shrink-0 p-0.5 rounded hover:bg-light-200 dark:hover:bg-dark-700',
                    'transition-colors text-light-600 dark:text-dark-400',
                    'hover:text-dark-950 dark:hover:text-dark-50'
                  )}
                  aria-label={t('common.close') || 'Clear selection'}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </>
          ) : (
            <span className="text-sm text-light-500 dark:text-dark-500">
              {placeholder || t('common.select') || 'Select token...'}
            </span>
          )}
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 flex-shrink-0 text-light-600 dark:text-dark-400 transition-transform duration-200',
            isOpen && 'transform rotate-180'
          )}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={cn(
            'absolute z-50 w-full mt-1 rounded-lg border shadow-lg',
            'bg-light-50 dark:bg-dark-800',
            'border-light-300 dark:border-dark-700',
            'overflow-hidden',
            'transition-all duration-200 ease-out'
          )}
        >
          {/* Поиск */}
          <div className="p-2 border-b border-light-200 dark:border-dark-700">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-light-500 dark:text-dark-500" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('common.search') || 'Search tokens...'}
                className={cn(
                  'w-full pl-9 pr-3 py-2 text-sm rounded-md border',
                  'bg-white dark:bg-dark-900',
                  'border-light-300 dark:border-dark-600',
                  'text-dark-950 dark:text-dark-50',
                  'placeholder:text-light-500 dark:placeholder:text-dark-500',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent'
                )}
              />
            </div>
          </div>

          {/* Список токенов */}
          <ul ref={listRef} role="listbox" className="max-h-60 overflow-y-auto">
            {filteredTokens.length === 0 ? (
              <li className="px-4 py-3 text-sm text-center text-light-500 dark:text-dark-500">
                {t('common.noData') || 'No tokens found'}
              </li>
            ) : (
              filteredTokens.map((token, index) => {
                const isSelected =
                  value?.symbol === token.symbol &&
                  value?.chain === token.chain;
                const isHighlighted = index === highlightedIndex;

                return (
                  <li
                    key={`${token.symbol}-${token.chain}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(token)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors',
                      isHighlighted &&
                        'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300',
                      !isHighlighted &&
                        'hover:bg-light-100 dark:hover:bg-dark-700 text-dark-950 dark:text-dark-50',
                      isSelected && 'font-medium'
                    )}
                  >
                    {/* Иконка chain */}
                    {showChain && (
                      <span className="text-lg flex-shrink-0">
                        {getChainIcon(token.chain)}
                      </span>
                    )}

                    {/* Символ токена */}
                    <span className="flex-1 text-sm font-medium truncate">
                      {token.symbol}
                    </span>

                    {/* Chain label */}
                    {showChain && (
                      <span className="text-xs text-light-500 dark:text-dark-500 flex-shrink-0">
                        {getChainLabel(token.chain)}
                      </span>
                    )}

                    {/* Checkmark для выбранного */}
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary-600 dark:text-primary-400 flex-shrink-0" />
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
