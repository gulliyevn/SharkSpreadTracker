import { mexcClient } from '../clients';
import { MexcExchangeInfoSchema } from '../schemas/mexc.schema';
import { extractMexcLimits } from '@/utils/mexc-limits';
import type { MexcTradingLimits } from '@/types';
import { logger } from '@/utils/logger';
import { rateLimiter } from '@/utils/security';
import { getErrorStatusCode, getErrorCode } from '@/utils/errors';

/**
 * Получить лимиты на покупку MEXC для конкретного токена
 * @param symbol - Символ токена (например, 'BTCUSDT' или 'BTC')
 * @param signal - AbortSignal для отмены запроса (опционально)
 * @returns Лимиты на покупку или null, если не найдены
 */
export async function getMexcTradingLimits(
  symbol: string,
  signal?: AbortSignal
): Promise<MexcTradingLimits | null> {
  // Проверка rate limiting
  if (!rateLimiter.isAllowed('mexc-api')) {
    logger.warn('MEXC API rate limit exceeded');
    return null;
  }

  try {
    // MEXC API - получение информации о бирже
    // Используем spot API /api/v3/exchangeInfo для получения лимитов
    const endpoint = import.meta.env.DEV
      ? '/v3/exchangeInfo'
      : '/api/v3/exchangeInfo';
    const response = await mexcClient.get(endpoint, { signal });

    // Валидация через Zod
    const validated = MexcExchangeInfoSchema.safeParse(response.data);

    if (!validated.success) {
      logger.warn('MEXC exchangeInfo validation failed:', validated.error);
      return null;
    }

    const exchangeInfo = validated.data;

    if (!exchangeInfo.symbols || !Array.isArray(exchangeInfo.symbols)) {
      return null;
    }

    // Ищем символ в списке
    // MEXC использует формат "BASEQUOTE" (например, "BTCUSDT")
    // Нужно найти по baseAsset или по полному symbol
    const mexcSymbol = exchangeInfo.symbols.find((s) => {
      // Точное совпадение symbol
      if (s.symbol === symbol || s.symbol === `${symbol}USDT`) {
        return true;
      }
      // Совпадение по baseAsset
      if (s.baseAsset?.toUpperCase() === symbol.toUpperCase()) {
        return true;
      }
      return false;
    });

    if (!mexcSymbol) {
      return null;
    }

    // Извлекаем лимиты из filters
    return extractMexcLimits(mexcSymbol);
  } catch (error: unknown) {
    const statusCode = getErrorStatusCode(error);
    const errorCode = getErrorCode(error);
    logger.error(
      `Error fetching MEXC trading limits: ${statusCode || errorCode || 'unknown'}`,
      error
    );
    return null;
  }
}
