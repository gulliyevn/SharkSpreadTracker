interface ExchangeIndicatorProps {
  sourceChain: 'solana' | 'bsc';
  targetExchange: string;
}

/**
 * Индикатор обмена между биржами
 */
export function ExchangeIndicator({
  sourceChain,
  targetExchange,
}: ExchangeIndicatorProps) {
  return (
    <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 rounded-lg bg-light-100 dark:bg-dark-800 border border-light-200 dark:border-dark-700">
      <span className="text-xs sm:text-sm font-medium text-dark-950 dark:text-dark-50">
        {sourceChain.toUpperCase()}
      </span>
      <span className="text-light-500 dark:text-dark-500">⇄</span>
      <span className="text-xs sm:text-sm font-medium text-dark-950 dark:text-dark-50">
        {targetExchange}
      </span>
    </div>
  );
}
