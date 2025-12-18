import { Card } from '@/components/ui/Card';
import { PriceDisplay } from '@/components/features/tokens/PriceDisplay';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { SOURCES } from '@/constants/sources';
import { cn } from '@/utils/cn';
import type { Token } from '@/types';
import type { SpreadResponse } from '@/types';

export interface CurrentPricesPanelProps {
  token: Token | null;
  spreadData: SpreadResponse | null;
  isLoading?: boolean;
  className?: string;
}

/**
 * Панель текущих цен для всех источников
 */
export function CurrentPricesPanel({
  token,
  spreadData,
  isLoading = false,
  className,
}: CurrentPricesPanelProps) {
  if (!token) {
    return (
      <Card className={cn('p-4', className)}>
        <p className="text-sm text-light-600 dark:text-dark-400">
          Select a token to view prices
        </p>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className={cn('p-4', className)}>
        <h3 className="text-sm font-semibold mb-3 text-dark-950 dark:text-dark-50">
          Current Prices - {token.symbol}
        </h3>
        <div className="flex items-center justify-center py-4">
          <LoadingSpinner size="sm" />
        </div>
      </Card>
    );
  }

  if (!spreadData) {
    return (
      <Card className={cn('p-4', className)}>
        <h3 className="text-sm font-semibold mb-3 text-dark-950 dark:text-dark-50">
          Current Prices - {token.symbol}
        </h3>
        <p className="text-sm text-light-600 dark:text-dark-400">
          No price data available
        </p>
      </Card>
    );
  }

  const { current, sources } = spreadData;

  if (!current) {
    return (
      <Card className={cn('p-4', className)}>
        <h3 className="text-sm font-semibold mb-3 text-dark-950 dark:text-dark-50">
          Current Prices - {token.symbol}
        </h3>
        <p className="text-sm text-light-600 dark:text-dark-400">
          No current price data available
        </p>
      </Card>
    );
  }

  return (
    <Card className={cn('p-4', className)}>
      <h3 className="text-sm font-semibold mb-3 text-dark-950 dark:text-dark-50">
        Current Prices - {token.symbol}
      </h3>

      <div className="space-y-3">
        {/* MEXC */}
        {sources.mexc && (
          <div className="p-3 rounded-lg bg-light-100 dark:bg-dark-900">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={cn('text-lg', SOURCES.mexc.colorTailwind)}
                role="img"
                aria-label={SOURCES.mexc.label}
              >
                {SOURCES.mexc.emoji}
              </span>
              <span className="font-medium text-sm text-dark-950 dark:text-dark-50">
                {SOURCES.mexc.label}
              </span>
            </div>
            {current.mexc_price !== null ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-light-600 dark:text-dark-400">
                    Price:
                  </span>
                  <PriceDisplay
                    value={current.mexc_price}
                    className="font-bold text-sm"
                  />
                </div>
                {current.mexc_bid !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-light-600 dark:text-dark-400">
                      Bid:
                    </span>
                    <PriceDisplay
                      value={current.mexc_bid}
                      className="text-sm"
                    />
                  </div>
                )}
                {current.mexc_ask !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-light-600 dark:text-dark-400">
                      Ask:
                    </span>
                    <PriceDisplay
                      value={current.mexc_ask}
                      className="text-sm"
                    />
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-light-500 dark:text-dark-500">
                Price not available
              </p>
            )}
          </div>
        )}

        {/* Jupiter */}
        {sources.jupiter && (
          <div className="p-3 rounded-lg bg-light-100 dark:bg-dark-900">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={cn('text-lg', SOURCES.jupiter.colorTailwind)}
                role="img"
                aria-label={SOURCES.jupiter.label}
              >
                {SOURCES.jupiter.emoji}
              </span>
              <span className="font-medium text-sm text-dark-950 dark:text-dark-50">
                {SOURCES.jupiter.label}
              </span>
            </div>
            {current.jupiter_price !== null ? (
              <PriceDisplay
                value={current.jupiter_price}
                className="font-bold text-sm"
              />
            ) : (
              <p className="text-xs text-light-500 dark:text-dark-500">
                Price not available
              </p>
            )}
          </div>
        )}

        {/* PancakeSwap */}
        {sources.pancakeswap && (
          <div className="p-3 rounded-lg bg-light-100 dark:bg-dark-900">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={cn('text-lg', SOURCES.pancakeswap.colorTailwind)}
                role="img"
                aria-label={SOURCES.pancakeswap.label}
              >
                {SOURCES.pancakeswap.emoji}
              </span>
              <span className="font-medium text-sm text-dark-950 dark:text-dark-50">
                {SOURCES.pancakeswap.label}
              </span>
            </div>
            {current.pancakeswap_price !== null ? (
              <PriceDisplay
                value={current.pancakeswap_price}
                className="font-bold text-sm"
              />
            ) : (
              <p className="text-xs text-light-500 dark:text-dark-500">
                Price not available
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
