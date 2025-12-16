import { Star, ArrowRight, Square, Pencil } from 'lucide-react';
import { useState, memo, useCallback } from 'react';
import { cn } from '@/utils/cn';
import type { Token } from '@/types';
import { PriceDisplay } from '@/components/features/tokens/PriceDisplay';
import { SpreadIndicator } from '@/components/features/tokens/SpreadIndicator';

interface TokenCardProps {
  token: Token;
  price?: number | null;
  directSpread?: number | null;
  reverseSpread?: number | null;
  isFavorite?: boolean;
  onFavoriteToggle?: (token: Token) => void;
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
}: TokenCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleFavoriteToggle = useCallback(() => {
    onFavoriteToggle?.(token);
  }, [onFavoriteToggle, token]);

  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);

  return (
    <div
      className={cn(
        'group relative bg-light-50 dark:bg-dark-800 border border-light-200 dark:border-dark-700 rounded-lg p-3 sm:p-4',
        'hover:border-primary-500 dark:hover:border-primary-500 transition-all duration-200',
        'hover:shadow-md dark:hover:shadow-lg',
        isHovered && 'ring-2 ring-primary-500/20'
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex items-start justify-between mb-2">
        {/* Левая часть: звезда и название */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            onClick={handleFavoriteToggle}
            className={cn(
              'flex-shrink-0 p-0.5 transition-colors',
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
        <SpreadIndicator
          value={directSpread}
          type="direct"
          className="mr-1"
        />
        <SpreadIndicator value={reverseSpread} type="reverse" />
      </div>

      {/* Иконки действий */}
      <div className="flex items-center gap-1.5 sm:gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className="p-1.5 rounded hover:bg-light-200 dark:hover:bg-dark-700 transition-colors"
          title="View details"
          aria-label="View token details"
        >
          <div className="w-4 h-4 sm:w-5 sm:h-5 bg-yellow-500 rounded" />
        </button>
        <button
          className="p-1.5 rounded hover:bg-light-200 dark:hover:bg-dark-700 transition-colors"
          title="Trade"
          aria-label="Trade token"
        >
          <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-primary-600 dark:text-primary-400" />
        </button>
        <button
          className="p-1.5 rounded hover:bg-light-200 dark:hover:bg-dark-700 transition-colors"
          title="More options"
          aria-label="More options"
        >
          <Square className="h-4 w-4 sm:h-5 sm:w-5 text-primary-600 dark:text-primary-400" />
        </button>
        <button
          className="p-1.5 rounded hover:bg-light-200 dark:hover:bg-dark-700 transition-colors"
          title="Edit"
          aria-label="Edit token"
        >
          <Pencil className="h-4 w-4 sm:h-5 sm:w-5 text-light-600 dark:text-dark-400" />
        </button>
      </div>
    </div>
  );
});
