/**
 * Утилиты для работы с MEXC Futures
 */

/**
 * Создать URL для MEXC Futures страницы токена
 * @param tokenSymbol - Символ токена (например, "BTC")
 * @returns URL для MEXC Futures
 */
export function createMexcFuturesUrl(tokenSymbol: string): string {
  // MEXC Futures URL формат: https://contract.mexc.com/exchange/{SYMBOL}_USDT
  const symbol = tokenSymbol.toUpperCase().trim();
  return `https://contract.mexc.com/exchange/${symbol}_USDT`;
}
