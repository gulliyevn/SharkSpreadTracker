import { Star, Copy, Check, Pencil } from 'lucide-react';
import { useState, memo, useCallback, useMemo } from 'react';
import { cn } from '@/utils/cn';
import type { Token } from '@/types';
import { PriceDisplay } from '@/components/features/tokens/PriceDisplay';
import { SpreadIndicator } from '@/components/features/tokens/SpreadIndicator';
import { getSourcesForChain } from '@/constants/sources';
import { useToast } from '@/contexts/ToastContext';
import { createJupiterSwapUrlWithUSDC } from '@/utils/jupiter-swap';
import { createPancakeSwapUrlWithBUSD } from '@/utils/pancakeswap-swap';

interface TokenCardProps {
  token: Token;
  price?: number | null;
  directSpread?: number | null;
  reverseSpread?: number | null;
  isFavorite?: boolean;
  onFavoriteToggle?: (token: Token) => void;
  onEdit?: (token: Token) => void;
}

/**
 * Карточка токена в стиле из скриншота
 * Оптимизирована с помощью React.memo для предотвращения лишних ререндеров
 */
export const TokenCard = memo(function TokenCard({
  token,
  price = null,
  directSpread = null,
  reverseSpread = null,
  isFavorite = false,
  onFavoriteToggle,
  onEdit,
}: TokenCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const { success } = useToast();

  // Получаем доступные источники для chain
  const availableSources = getSourcesForChain(token.chain);

  // URL для бирж
  const exchangeUrls = useMemo<Record<string, string>>(
    () => ({
      mexc: 'https://www.mexc.com',
      jupiter: token.address && token.chain === 'solana'
        ? createJupiterSwapUrlWithUSDC(token.address, 'buy')
        : 'https://jup.ag',
      pancakeswap: token.address && token.chain === 'bsc'
        ? createPancakeSwapUrlWithBUSD(token.address, 'buy')
        : 'https://pancakeswap.finance',
    }),
    [token]
  );

  // Вычисляем максимальный спред для динамического ring
  const maxSpread = Math.max(directSpread || 0, reverseSpread || 0);
  const ringOpacity =
    maxSpread > 5 ? 0.6 : maxSpread > 2 ? 0.4 : maxSpread > 0.5 ? 0.2 : 0.05;

  const handleFavoriteToggle = useCallback(() => {
    onFavoriteToggle?.(token);
  }, [onFavoriteToggle, token]);

  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);

  const handleCopyAddress = useCallback(async () => {
    if (!token.address) return;

    try {
      await navigator.clipboard.writeText(token.address);
      setIsCopied(true);
      success('Address copied to clipboard');
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Fallback для старых браузеров
      const textArea = document.createElement('textarea');
      textArea.value = token.address;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setIsCopied(true);
        success('Address copied to clipboard');
        setTimeout(() => setIsCopied(false), 2000);
      } catch {
        // Игнорируем ошибку
      }
      document.body.removeChild(textArea);
    }
  }, [token.address, success]);

  const handleExchangeClick = useCallback(
    (sourceId: string) => {
      const url = exchangeUrls[sourceId];
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    },
    [exchangeUrls]
  );

  const handleEdit = useCallback(() => {
    onEdit?.(token);
  }, [onEdit, token]);

  return (
    <article
      className={cn(
        'group relative bg-light-50 dark:bg-dark-800 border border-light-200 dark:border-dark-700 rounded-lg p-3 sm:p-4',
        'hover:border-primary-500 dark:hover:border-primary-500 transition-all duration-200',
        'hover:shadow-md dark:hover:shadow-lg',
        isHovered && 'ring-2 ring-primary-500'
      )}
      style={
        isHovered
          ? ({
              // Динамический ring opacity на основе спреда
              '--tw-ring-opacity': ringOpacity,
            } as React.CSSProperties)
          : undefined
      }
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      aria-label={`Token ${token.symbol} on ${token.chain}`}
    >
      <div className="flex items-start justify-between mb-2">
        {/* Левая часть: звезда, название и кнопка копирования */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            onClick={handleFavoriteToggle}
            className={cn(
              'flex-shrink-0 p-2 transition-colors touch-manipulation',
              'min-w-[44px] min-h-[44px] flex items-center justify-center', // Минимум 44x44px для touch targets
              isFavorite
                ? 'text-yellow-500'
                : 'text-light-400 dark:text-dark-500 hover:text-yellow-500'
            )}
            aria-label={
              isFavorite ? 'Remove from favorites' : 'Add to favorites'
            }
          >
            <Star
              className={cn(
                'h-4 w-4 sm:h-5 sm:w-5',
                isFavorite && 'fill-current'
              )}
            />
          </button>
          <span className="font-bold text-sm sm:text-base text-dark-950 dark:text-dark-50 truncate">
            {token.symbol}
          </span>
          {/* Кнопка копирования address */}
          {token.address && (
            <button
              onClick={handleCopyAddress}
              className={cn(
                'flex-shrink-0 p-2 rounded transition-colors touch-manipulation',
                'min-w-[44px] min-h-[44px] flex items-center justify-center', // Минимум 44x44px для touch targets
                isCopied
                  ? 'text-green-500 dark:text-green-400'
                  : 'text-light-500 dark:text-dark-400 hover:text-primary-500 dark:hover:text-primary-400'
              )}
              aria-label="Copy token address"
              title="Copy address"
            >
              {isCopied ? (
                <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              ) : (
                <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              )}
            </button>
          )}
        </div>

        {/* Правая часть: цена */}
        <div className="flex-shrink-0 ml-2">
          <PriceDisplay
            value={price}
            className="font-bold text-sm sm:text-base"
          />
        </div>
      </div>

      {/* Процентные метки (зеленая и красная) */}
      <div className="flex items-center gap-2 mb-3">
        <SpreadIndicator value={directSpread} type="direct" className="mr-1" />
        <SpreadIndicator value={reverseSpread} type="reverse" />
      </div>

      {/* Иконки бирж (кликабельные) и кнопка редактирования */}
      <div className="flex items-center gap-1.5 sm:gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Иконки бирж */}
        {availableSources.map((source) => (
          <button
            key={source.id}
            onClick={() => handleExchangeClick(source.id)}
            className={cn(
              'p-2 rounded hover:bg-light-200 dark:hover:bg-dark-700 transition-colors touch-manipulation',
              'min-w-[44px] min-h-[44px] flex items-center justify-center', // Минимум 44x44px для touch targets
              'hover:scale-110 active:scale-95'
            )}
            title={`Open ${source.label}`}
            aria-label={`Open ${source.label} exchange`}
          >
            <span
              className={cn('text-lg sm:text-xl', source.colorTailwind)}
              role="img"
              aria-label={source.label}
            >
              {source.emoji}
            </span>
          </button>
        ))}
        {/* Кнопка редактирования */}
        {onEdit && (
          <button
            onClick={handleEdit}
            className="p-2 rounded hover:bg-light-200 dark:hover:bg-dark-700 transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Edit token settings"
            aria-label="Edit token settings"
          >
            <Pencil className="h-4 w-4 sm:h-5 sm:w-5 text-light-600 dark:text-dark-400" />
          </button>
        )}
      </div>
    </article>
  );
});
