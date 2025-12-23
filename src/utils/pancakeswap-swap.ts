/**
 * Утилиты для работы с PancakeSwap Swap
 */

/**
 * Создать URL для PancakeSwap Swap
 * @param tokenAddress - Адрес токена для покупки (contract address на BSC)
 * @returns URL для PancakeSwap Swap
 */
export function createPancakeSwapUrl(tokenAddress: string): string {
  // PancakeSwap Swap URL формат: https://pancakeswap.finance/swap?outputCurrency={tokenAddress}
  return `https://pancakeswap.finance/swap?outputCurrency=${encodeURIComponent(tokenAddress)}`;
}

/**
 * Создать URL для PancakeSwap Swap с BUSD (для арбитража)
 * @param tokenAddress - Адрес токена
 * @param direction - Направление swap: 'buy' (купить токен за BUSD) или 'sell' (продать токен за BUSD)
 * @returns URL для PancakeSwap Swap
 */
export function createPancakeSwapUrlWithBUSD(
  tokenAddress: string,
  direction: 'buy' | 'sell' = 'buy'
): string {
  // BUSD на BSC: 0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56
  const BUSD_BSC = '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56';

  if (direction === 'buy') {
    // Покупаем токен за BUSD - используем outputCurrency
    return createPancakeSwapUrl(tokenAddress);
  } else {
    // Продаем токен за BUSD - используем inputCurrency
    return `https://pancakeswap.finance/swap?inputCurrency=${encodeURIComponent(tokenAddress)}&outputCurrency=${encodeURIComponent(BUSD_BSC)}`;
  }
}

/**
 * Получить адрес токена из Token объекта
 * @param token - Токен
 * @returns Адрес токена или null
 */
export function getTokenAddress(token: { address?: string }): string | null {
  return token.address || null;
}
