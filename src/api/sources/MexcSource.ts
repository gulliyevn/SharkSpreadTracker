import { BaseApiSource } from './BaseApiSource';
import type { Token } from '@/types';
import type { TokenPrice } from '../endpoints/prices.api';
import { mexcClient } from '../clients';
import { logger } from '@/utils/logger';
import { MexcTickerSchema } from '../schemas';
import { validateTokenSymbol } from '@/utils/validation';
import { isCanceledError } from '@/utils/errors';

// Определяем, используется ли прокси
const USE_PROXY = import.meta.env.VITE_USE_PROXY !== 'false';

/**
 * Реализация источника MEXC API
 * Поддерживает оба блокчейна (Solana и BSC)
 */
export class MexcSource extends BaseApiSource {
  readonly id = 'mexc' as const;
  readonly name = 'MEXC';
  readonly supportedChains: ('solana' | 'bsc')[] = ['solana', 'bsc'];

  protected get rateLimitKey(): string {
    return 'mexc-api';
  }

  /**
   * Получить токены из MEXC API
   */
  protected async fetchTokens(signal?: AbortSignal): Promise<Token[]> {
    // MEXC API - получение информации о бирже
    const endpoint = import.meta.env.DEV && USE_PROXY
      ? '/v3/exchangeInfo' // С прокси: прокси перепишет /api/mexc/v3/exchangeInfo -> /api/v3/exchangeInfo
      : '/api/v3/exchangeInfo'; // Без прокси: полный путь от корня contract.mexc.com

    logger.debug(`MEXC API: using endpoint ${endpoint}`);
    const response = await mexcClient.get(endpoint, { signal });

    // Проверяем структуру ответа
    if (!response.data || typeof response.data !== 'object') {
      logger.warn('MEXC API: response is not an object', response.data);
      return [];
    }

    const data = response.data as { symbols?: unknown[] };
    if (!data.symbols || !Array.isArray(data.symbols)) {
      logger.warn('MEXC API: symbols array not found or invalid', data);
      return [];
    }

    // Преобразуем данные MEXC в наш формат
    const tokensMap = new Map<string, Token>();

    data.symbols.forEach((symbolItem) => {
      // Безопасная проверка структуры
      if (
        !symbolItem ||
        typeof symbolItem !== 'object' ||
        !('symbol' in symbolItem) ||
        !('status' in symbolItem)
      ) {
        return;
      }

      const symbol = symbolItem as {
        symbol: string;
        status: string | number;
        baseAsset?: string;
        quoteAsset?: string;
        isSpotTradingAllowed?: boolean;
      };

      // MEXC API: status "1" означает активный, isSpotTradingAllowed должен быть true
      const isActive =
        (symbol.status === '1' || symbol.status === 1) &&
        symbol.isSpotTradingAllowed !== false;

      // Валидация символа токена перед добавлением
      if (!validateTokenSymbol(symbol.baseAsset)) {
        return; // Пропускаем токены с некорректными символами
      }

      if (symbol.symbol && isActive && symbol.baseAsset) {
        // MEXC поддерживает оба блокчейна, но для простоты используем BSC
        // Можно улучшить логику определения блокчейна
        const chain: 'solana' | 'bsc' = 'bsc';

        const tokenSymbol = symbol.baseAsset.toUpperCase();
        if (tokenSymbol) {
          const key = `${tokenSymbol}-${chain}`;
          if (!tokensMap.has(key)) {
            tokensMap.set(key, {
              symbol: tokenSymbol,
              chain,
            });
          }
        }
      }
    });

    const result = Array.from(tokensMap.values());
    logger.debug(`MEXC API: successfully parsed ${result.length} unique tokens from ${data.symbols.length} symbols`);
    return result;
  }

  /**
   * Получить цену токена из MEXC API
   */
  protected async fetchPrice(
    symbol: string,
    _address?: string,
    signal?: AbortSignal
  ): Promise<TokenPrice | null> {
    // Валидация символа перед запросом
    if (!validateTokenSymbol(symbol)) {
      logger.debug(`MEXC price: invalid symbol "${symbol}", skipping request`);
      return null;
    }

    try {
      // MEXC API для получения тикера
      const endpoint = import.meta.env.DEV && USE_PROXY
        ? `/v3/ticker/bookTicker?symbol=${symbol}`
        : `/api/v3/ticker/bookTicker?symbol=${symbol}`;
      const response = await mexcClient.get(endpoint, { signal });

      // Обрабатываем случай, когда API возвращает массив вместо объекта
      let tickerData = response.data;
      if (Array.isArray(tickerData)) {
        tickerData = tickerData.length > 0 ? tickerData[0] : null;
        if (!tickerData) {
          logger.debug(`MEXC: bookTicker returned empty array for ${symbol}`);
        } else {
          logger.debug(`MEXC: bookTicker returned array, using first element for ${symbol}`);
        }
      }

      // Валидация через Zod
      const validated = tickerData ? MexcTickerSchema.safeParse(tickerData) : { success: false, error: null };

      if (!validated.success) {
        // Если bookTicker не работает, пробуем обычный ticker
        try {
          const fallbackEndpoint = import.meta.env.DEV && USE_PROXY
            ? `/v3/ticker/price?symbol=${symbol}`
            : `/api/v3/ticker/price?symbol=${symbol}`;
          const tickerResponse = await mexcClient.get(fallbackEndpoint, {
            signal,
          });
          const priceStr = tickerResponse.data?.price;
          if (priceStr) {
            const price = parseFloat(priceStr);
            if (!isNaN(price) && price > 0) {
              return {
                price,
                timestamp: Date.now(),
                source: 'mexc',
              };
            }
          }
        } catch (tickerError) {
          if (isCanceledError(tickerError)) {
            logger.debug('MEXC ticker price request was canceled');
            return null;
          }
          logger.error('Error fetching MEXC ticker price:', tickerError);
        }

        logger.warn('MEXC price validation failed:', validated.error);
        return null;
      }

      if (!validated.success || !('data' in validated)) {
        return null;
      }

      const ticker = validated.data;
      const price = parseFloat(ticker.price);
      const bidPrice = ticker.bidPrice ? parseFloat(ticker.bidPrice) : null;
      const askPrice = ticker.askPrice ? parseFloat(ticker.askPrice) : null;

      if (isNaN(price) || price <= 0) {
        return null;
      }

      return {
        price,
        bid: bidPrice && !isNaN(bidPrice) && bidPrice > 0 ? bidPrice : null,
        ask: askPrice && !isNaN(askPrice) && askPrice > 0 ? askPrice : null,
        timestamp: Date.now(),
        source: 'mexc',
      };
    } catch (error) {
      if (isCanceledError(error)) {
        logger.debug('MEXC price request was canceled');
        return null;
      }
      throw error;
    }
  }
}

