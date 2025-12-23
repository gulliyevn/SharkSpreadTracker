/**
 * Утилиты для работы с Jupiter Swap
 */

/**
 * Создать URL для Jupiter Swap
 * @param sellToken - Адрес токена для продажи (mint address)
 * @param buyToken - Адрес токена для покупки (mint address)
 * @returns URL для Jupiter Swap
 */
export function createJupiterSwapUrl(
  sellToken: string,
  buyToken: string
): string {
  // Jupiter Swap URL формат: https://jup.ag/swap?sell={sellToken}&buy={buyToken}
  return `https://jup.ag/swap?sell=${encodeURIComponent(sellToken)}&buy=${encodeURIComponent(buyToken)}`;
}

/**
 * Создать URL для Jupiter Swap с USDC (для арбитража)
 * @param tokenAddress - Адрес токена
 * @param direction - Направление swap: 'buy' (купить токен за USDC) или 'sell' (продать токен за USDC)
 * @returns URL для Jupiter Swap
 */
export function createJupiterSwapUrlWithUSDC(
  tokenAddress: string,
  direction: 'buy' | 'sell' = 'buy'
): string {
  // USDC на Solana: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
  const USDC_SOLANA = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

  if (direction === 'buy') {
    // Покупаем токен за USDC
    return createJupiterSwapUrl(USDC_SOLANA, tokenAddress);
  } else {
    // Продаем токен за USDC
    return createJupiterSwapUrl(tokenAddress, USDC_SOLANA);
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
