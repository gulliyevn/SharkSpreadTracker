import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ChevronDown, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/utils/cn';
import { SOURCES, getSourcesForChain } from '@/constants/sources';
import type { SourceType } from '@/types';
import type { Token } from '@/types';

export interface SourceSelectorProps {
  token: Token | null;
  source1: SourceType | null;
  source2: SourceType | null;
  onSource1Change: (source: SourceType) => void;
  onSource2Change: (source: SourceType) => void;
  className?: string;
}

// Определяем тип биржи (DEX или CEX)
const getExchangeType = (sourceId: SourceType): 'DEX' | 'CEX' => {
  // MEXC - централизованная биржа (CEX)
  if (sourceId === 'mexc') return 'CEX';
  // Jupiter и PancakeSwap - децентрализованные биржи (DEX)
  return 'DEX';
};

/**
 * Компонент для выбора источников для сравнения спреда
 * Source 1 (Buy from) и Source 2 (Sell to)
 */
export function SourceSelector({
  token,
  source1,
  source2,
  onSource1Change,
  onSource2Change,
  className,
}: SourceSelectorProps) {
  const [isOpen1, setIsOpen1] = useState(false);
  const [isOpen2, setIsOpen2] = useState(false);
  const containerRef1 = useRef<HTMLDivElement>(null);
  const containerRef2 = useRef<HTMLDivElement>(null);

  // Получаем доступные источники для выбранной цепи
  const availableSources = useMemo(() => {
    if (!token) return [];
    return getSourcesForChain(token.chain);
  }, [token]);

  // Закрываем dropdown при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef1.current &&
        !containerRef1.current.contains(event.target as Node)
      ) {
        setIsOpen1(false);
      }
      if (
        containerRef2.current &&
        !containerRef2.current.contains(event.target as Node)
      ) {
        setIsOpen2(false);
      }
    };

    if (isOpen1 || isOpen2) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen1, isOpen2]);

  const handleSelect1 = useCallback(
    (source: SourceType) => {
      if (source !== source2) {
        onSource1Change(source);
      }
      setIsOpen1(false);
    },
    [source2, onSource1Change]
  );

  const handleSelect2 = useCallback(
    (source: SourceType) => {
      if (source !== source1) {
        onSource2Change(source);
      }
      setIsOpen2(false);
    },
    [source1, onSource2Change]
  );

  const getSourceDisplay = (sourceId: SourceType | null) => {
    if (!sourceId) return 'Select source...';
    const source = SOURCES[sourceId];
    const exchangeType = getExchangeType(sourceId);
    return `${source.label} [${exchangeType}]`;
  };

  if (!token) {
    return (
      <Card className={cn('p-4', className)}>
        <p className="text-sm text-light-600 dark:text-dark-400">
          Select a token first
        </p>
      </Card>
    );
  }

  return (
    <Card className={cn('p-4', className)}>
      <h3 className="text-sm font-semibold mb-3 text-dark-950 dark:text-dark-50">
        Compare Sources
      </h3>

      <div className="space-y-3">
        {/* Source 1 (Buy from) */}
        <div>
          <label className="block text-xs font-medium mb-1.5 text-light-600 dark:text-dark-400">
            Buy from (Source 1)
          </label>
          <div ref={containerRef1} className="relative">
            <button
              type="button"
              onClick={() => setIsOpen1(!isOpen1)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsOpen1(!isOpen1);
                } else if (e.key === 'Escape' && isOpen1) {
                  e.preventDefault();
                  setIsOpen1(false);
                }
              }}
              aria-label="Select source to buy from"
              aria-expanded={isOpen1}
              aria-haspopup="listbox"
              className={cn(
                'w-full flex items-center justify-between gap-2',
                'px-3 py-2 rounded-lg border transition-all',
                'bg-light-50 dark:bg-dark-900',
                'border-light-300 dark:border-dark-700',
                'text-dark-950 dark:text-dark-50',
                'hover:border-primary-500 dark:hover:border-primary-500',
                'focus:outline-none',
                isOpen1 &&
                  'ring-2 ring-primary-500 border-primary-500 dark:border-primary-500'
              )}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {source1 && (
                  <>
                    <span
                      className={cn('text-lg', SOURCES[source1].colorTailwind)}
                      role="img"
                      aria-label={SOURCES[source1].label}
                    >
                      {SOURCES[source1].emoji}
                    </span>
                    <span className="text-sm font-medium truncate">
                      {getSourceDisplay(source1)}
                    </span>
                  </>
                )}
                {!source1 && (
                  <span className="text-sm text-light-500 dark:text-dark-500">
                    Select source...
                  </span>
                )}
              </div>
              <ChevronDown
                className={cn(
                  'h-4 w-4 flex-shrink-0 text-light-600 dark:text-dark-400 transition-transform',
                  isOpen1 && 'transform rotate-180'
                )}
              />
            </button>

            {/* Dropdown для Source 1 */}
            {isOpen1 && (
              <div
                className={cn(
                  'absolute z-50 w-full mt-1 rounded-lg border shadow-lg',
                  'bg-light-50 dark:bg-dark-800',
                  'border-light-300 dark:border-dark-700',
                  'overflow-hidden'
                )}
              >
                <ul
                  className="max-h-48 overflow-y-auto"
                  role="listbox"
                  aria-label="Available sources to buy from"
                >
                  {availableSources
                    .filter((source) => source.id !== source2)
                    .map((source) => {
                      const exchangeType = getExchangeType(source.id);
                      const isSelected = source1 === source.id;

                      return (
                        <li
                          key={source.id}
                          role="option"
                          aria-selected={isSelected}
                        >
                          <button
                            onClick={() => handleSelect1(source.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleSelect1(source.id);
                              }
                            }}
                            aria-label={`Select ${source.label} (${exchangeType}) as source to buy from`}
                            className={cn(
                              'w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors',
                              'text-left',
                              isSelected
                                ? 'bg-primary-500 text-white font-medium'
                                : 'hover:bg-light-100 dark:hover:bg-dark-700 text-dark-950 dark:text-dark-50'
                            )}
                          >
                            <span
                              className={cn('text-lg', source.colorTailwind)}
                              role="img"
                              aria-label={source.label}
                            >
                              {source.emoji}
                            </span>
                            <span className="flex-1">
                              {source.label} [{exchangeType}]
                            </span>
                          </button>
                        </li>
                      );
                    })}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Стрелка направления */}
        <div className="flex items-center justify-center py-1">
          <ArrowRight className="h-5 w-5 text-light-500 dark:text-dark-500" />
        </div>

        {/* Source 2 (Sell to) */}
        <div>
          <label className="block text-xs font-medium mb-1.5 text-light-600 dark:text-dark-400">
            Sell to (Source 2)
          </label>
          <div ref={containerRef2} className="relative">
            <button
              type="button"
              onClick={() => setIsOpen2(!isOpen2)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsOpen2(!isOpen2);
                } else if (e.key === 'Escape' && isOpen2) {
                  e.preventDefault();
                  setIsOpen2(false);
                }
              }}
              aria-label="Select source to sell to"
              aria-expanded={isOpen2}
              aria-haspopup="listbox"
              className={cn(
                'w-full flex items-center justify-between gap-2',
                'px-3 py-2 rounded-lg border transition-all',
                'bg-light-50 dark:bg-dark-900',
                'border-light-300 dark:border-dark-700',
                'text-dark-950 dark:text-dark-50',
                'hover:border-primary-500 dark:hover:border-primary-500',
                'focus:outline-none',
                isOpen2 &&
                  'ring-2 ring-primary-500 border-primary-500 dark:border-primary-500'
              )}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {source2 && (
                  <>
                    <span
                      className={cn('text-lg', SOURCES[source2].colorTailwind)}
                      role="img"
                      aria-label={SOURCES[source2].label}
                    >
                      {SOURCES[source2].emoji}
                    </span>
                    <span className="text-sm font-medium truncate">
                      {getSourceDisplay(source2)}
                    </span>
                  </>
                )}
                {!source2 && (
                  <span className="text-sm text-light-500 dark:text-dark-500">
                    Select source...
                  </span>
                )}
              </div>
              <ChevronDown
                className={cn(
                  'h-4 w-4 flex-shrink-0 text-light-600 dark:text-dark-400 transition-transform',
                  isOpen2 && 'transform rotate-180'
                )}
              />
            </button>

            {/* Dropdown для Source 2 */}
            {isOpen2 && (
              <div
                className={cn(
                  'absolute z-50 w-full mt-1 rounded-lg border shadow-lg',
                  'bg-light-50 dark:bg-dark-800',
                  'border-light-300 dark:border-dark-700',
                  'overflow-hidden'
                )}
              >
                <ul
                  className="max-h-48 overflow-y-auto"
                  role="listbox"
                  aria-label="Available sources to sell to"
                >
                  {availableSources
                    .filter((source) => source.id !== source1)
                    .map((source) => {
                      const exchangeType = getExchangeType(source.id);
                      const isSelected = source2 === source.id;

                      return (
                        <li
                          key={source.id}
                          role="option"
                          aria-selected={isSelected}
                        >
                          <button
                            onClick={() => handleSelect2(source.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleSelect2(source.id);
                              }
                            }}
                            aria-label={`Select ${source.label} (${exchangeType}) as source to sell to`}
                            className={cn(
                              'w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors',
                              'text-left',
                              isSelected
                                ? 'bg-primary-500 text-white font-medium'
                                : 'hover:bg-light-100 dark:hover:bg-dark-700 text-dark-950 dark:text-dark-50'
                            )}
                          >
                            <span
                              className={cn('text-lg', source.colorTailwind)}
                              role="img"
                              aria-label={source.label}
                            >
                              {source.emoji}
                            </span>
                            <span className="flex-1">
                              {source.label} [{exchangeType}]
                            </span>
                          </button>
                        </li>
                      );
                    })}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
