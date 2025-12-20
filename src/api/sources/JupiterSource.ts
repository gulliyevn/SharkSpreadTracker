import { BaseApiSource } from './BaseApiSource';
import type { Token } from '@/types';
import type { TokenPrice } from '../endpoints/prices.api';
import { jupiterClient } from '../clients';
import { SOURCE_URLS } from '@/constants/api';
import { logger } from '@/utils/logger';
import { RequestPriority } from '@/utils/request-queue';
import { getErrorStatusCode } from '@/utils/errors';
import { validateTokenSymbol } from '@/utils/validation';

/**
 * Интерфейс для ответа Jupiter Token API V2
 */
interface JupiterTokenResponse {
  id: string; // Mint address (в V2 это 'id', а не 'address')
  symbol: string;
  name?: string;
  decimals?: number;
  icon?: string;
}

/**
 * Реализация источника Jupiter API
 * Поддерживает Solana блокчейн
 */
export class JupiterSource extends BaseApiSource {
  readonly id = 'jupiter' as const;
  readonly name = 'Jupiter';
  readonly supportedChains: ('solana' | 'bsc')[] = ['solana'];

  protected get rateLimitKey(): string {
    return 'jupiter-api';
  }

  protected get requestPriority(): RequestPriority {
    return RequestPriority.HIGH;
  }

  requiresAddress(): boolean {
    return true; // Jupiter требует mint address для получения цены
  }

  /**
   * Получить токены из Jupiter API
   */
  protected async fetchTokens(signal?: AbortSignal): Promise<Token[]> {
    const apiKey = import.meta.env.VITE_JUPITER_API_KEY;
    const hasApiKey = !!apiKey && apiKey.trim().length > 0;
    const isNewApi = SOURCE_URLS.JUPITER.includes('api.jup.ag');

    // Логируем для диагностики
    if (import.meta.env.DEV) {
      logger.debug(
        `Jupiter API: hasApiKey=${hasApiKey}, apiKeyLength=${apiKey?.length || 0}, baseURL=${SOURCE_URLS.JUPITER}`
      );
    }

    // Список эндпоинтов для попытки (в порядке приоритета)
    const endpoints = [
      '/tokens/v2/recent', // Token API V2 - список недавних токенов (работает без ключа)
      '/tokens/v2', // Fallback (может не работать)
    ];

    let lastError: unknown = null;

    // Пробуем каждый эндпоинт
    for (const endpoint of endpoints) {
      try {
        logger.debug(
          `Jupiter API: trying endpoint ${endpoint}, hasApiKey: ${hasApiKey}, isNewApi: ${isNewApi}, baseURL: ${SOURCE_URLS.JUPITER}`
        );
        const response = await jupiterClient.get(endpoint, { signal });

        logger.debug(
          `Jupiter API: response status ${response.status}, data type: ${Array.isArray(response.data) ? 'array' : typeof response.data}, length: ${Array.isArray(response.data) ? response.data.length : 'N/A'}`
        );

        if (!response.data || !Array.isArray(response.data)) {
          logger.warn('Jupiter API: response is not an array', response.data);
          continue; // Пробуем следующий эндпоинт
        }

        // Преобразуем данные Jupiter в наш формат
        const tokens = response.data as JupiterTokenResponse[];
        const result: Token[] = [];
        tokens.forEach((item) => {
          const mintAddress = item.id || (item as unknown as { address?: string }).address;
          const symbol = item.symbol?.toUpperCase();
          // Валидация символа перед добавлением
          if (symbol && mintAddress && validateTokenSymbol(symbol)) {
            result.push({
              symbol,
              chain: 'solana' as const,
              address: mintAddress,
            });
          }
        });

        logger.debug(
          `Jupiter API: parsed ${result.length} tokens from ${tokens.length} items using endpoint ${endpoint}`
        );
        return result;
      } catch (endpointError: unknown) {
        lastError = endpointError;
        const statusCode = getErrorStatusCode(endpointError);

        // Если 404, пробуем следующий эндпоинт
        if (statusCode === 404) {
          logger.debug(`Jupiter API: endpoint ${endpoint} returned 404, trying next`);
          continue;
        }

        logger.warn(
          `Jupiter API: error on endpoint ${endpoint}: ${statusCode || 'unknown'}`
        );
      }
    }

    // Если все эндпоинты не сработали, выбрасываем ошибку
    if (lastError) {
      const jupiterStatusCode = getErrorStatusCode(lastError);
      throw new Error(
        `Error fetching Jupiter tokens (all endpoints failed): ${jupiterStatusCode || 'unknown'}`
      );
    }

    return [];
  }

  /**
   * Получить цену токена из Jupiter API
   */
  protected async fetchPrice(
    symbol: string,
    address?: string,
    signal?: AbortSignal
  ): Promise<TokenPrice | null> {
    // Jupiter требует address для получения цены
    if (!address) {
      logger.debug(`Jupiter price: address required for ${symbol}, returning null`);
      return null;
    }

    // Используем Price API V3
    const endpoint = `/price/v3?ids=${address}`;
    const response = await jupiterClient.get(endpoint, { signal });

    // Price API V3 возвращает объект с ключами-адресами и значениями-ценами
    if (!response.data || typeof response.data !== 'object') {
      logger.debug(`Jupiter price: invalid response for ${symbol}`);
      return null;
    }

    const priceData = response.data as Record<string, { usdPrice?: number } | null>;
    const tokenPrice = priceData[address];

    if (!tokenPrice || !tokenPrice.usdPrice || tokenPrice.usdPrice <= 0) {
      logger.debug(`Jupiter price: no valid price for ${symbol}`);
      return null;
    }

    return {
      price: tokenPrice.usdPrice,
      timestamp: Date.now(),
      source: 'jupiter',
    };
  }
}

