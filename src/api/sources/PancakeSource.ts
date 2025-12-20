import { BaseApiSource } from './BaseApiSource';
import type { Token } from '@/types';
import type { TokenPrice } from '../endpoints/prices.api';
import { pancakeClient } from '../clients';
import { CHAIN_IDS } from '@/constants/chains';
import { logger } from '@/utils/logger';
import { DexScreenerResponseSchema } from '../schemas';
import { validateTokenSymbol } from '@/utils/validation';
import { queuedRequest, RequestPriority } from '@/utils/request-queue';

/**
 * Интерфейс для ответа DexScreener API
 */
interface DexScreenerPair {
  chainId?: string;
  baseToken?: {
    symbol: string;
    address?: string;
  };
  quoteToken?: {
    symbol: string;
    address?: string;
  };
  priceUsd?: string;
}

interface DexScreenerResponse {
  schemaVersion?: string;
  pairs?: DexScreenerPair[];
}

/**
 * Реализация источника PancakeSwap/DexScreener API
 * Поддерживает BSC блокчейн
 */
export class PancakeSource extends BaseApiSource {
  readonly id = 'pancakeswap' as const;
  readonly name = 'PancakeSwap';
  readonly supportedChains: ('solana' | 'bsc')[] = ['bsc'];

  protected get rateLimitKey(): string {
    return 'pancakeswap-api';
  }

  /**
   * Получить токены из PancakeSwap/DexScreener API
   */
  protected async fetchTokens(signal?: AbortSignal): Promise<Token[]> {
    // DexScreener API - получение популярных токенов BSC
    const popularTokens = ['BNB', 'CAKE', 'BUSD', 'USDT', 'ETH', 'BTC'];
    const tokensMap = new Map<string, Token>();

    // Получаем данные для популярных токенов через очередь
    const tokenPromises = popularTokens
      .filter((tokenSymbol) => validateTokenSymbol(tokenSymbol))
      .map((tokenSymbol) =>
        queuedRequest(
          async () => {
            try {
              const searchPath =
                '/latest/dex/search?q=' + encodeURIComponent(tokenSymbol);
              const response = await pancakeClient.get<DexScreenerResponse>(
                searchPath,
                { signal }
              );
              return response.data;
            } catch {
              return null;
            }
          },
          {
            priority: RequestPriority.NORMAL,
            maxRetries: 1,
            rateLimitKey: this.rateLimitKey,
          }
        )
      );

    const results = await Promise.allSettled(tokenPromises);

    // Обрабатываем результаты
    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        const data = result.value as DexScreenerResponse;
        if (data.pairs && Array.isArray(data.pairs)) {
          data.pairs.forEach((pair) => {
            // Фильтруем только пары на BSC
            if (pair.chainId !== 'bsc') {
              return;
            }

            // Обрабатываем baseToken
            if (pair.baseToken?.symbol) {
              const symbol = pair.baseToken.symbol.toUpperCase();
              const address = pair.baseToken.address;
              if (validateTokenSymbol(symbol)) {
                if (!tokensMap.has(symbol) || address) {
                  tokensMap.set(symbol, {
                    symbol,
                    chain: 'bsc' as const,
                    address: address || tokensMap.get(symbol)?.address,
                  });
                }
              }
            }
            // Обрабатываем quoteToken
            if (pair.quoteToken?.symbol) {
              const symbol = pair.quoteToken.symbol.toUpperCase();
              const address = pair.quoteToken.address;
              if (validateTokenSymbol(symbol)) {
                if (!tokensMap.has(symbol) || address) {
                  tokensMap.set(symbol, {
                    symbol,
                    chain: 'bsc' as const,
                    address: address || tokensMap.get(symbol)?.address,
                  });
                }
              }
            }
          });
        }
      }
    });

    const result = Array.from(tokensMap.values());
    logger.debug(`PancakeSwap API: successfully parsed ${result.length} unique tokens`);
    return result;
  }

  /**
   * Получить цену токена из PancakeSwap/DexScreener API
   */
  protected async fetchPrice(
    symbol: string,
    _address?: string,
    signal?: AbortSignal
  ): Promise<TokenPrice | null> {
    // Валидация символа перед запросом
    if (!validateTokenSymbol(symbol)) {
      logger.debug(`PancakeSwap price: invalid symbol "${symbol}", skipping request`);
      return null;
    }

    // DexScreener API для получения цены
    const encodedSymbol = encodeURIComponent(symbol);
    const response = await pancakeClient.get(`/latest/dex/search?q=${encodedSymbol}`, {
      signal,
    });

    // Валидация через Zod
    const validated = DexScreenerResponseSchema.safeParse(response.data);

    if (!validated.success) {
      logger.warn('PancakeSwap price validation failed:', validated.error);
      return null;
    }

    const data = validated.data;
    const pairs = data.pairs || [];

    // Ищем пару с нужным символом на BSC
    const pair = pairs.find(
      (p) =>
        p.baseToken?.symbol?.toUpperCase() === symbol.toUpperCase() &&
        CHAIN_IDS.BSC.includes(p.chainId as (typeof CHAIN_IDS.BSC)[number])
    );

    if (!pair || !pair.priceUsd) {
      return null;
    }

    const price = parseFloat(pair.priceUsd);
    if (isNaN(price) || price <= 0) {
      return null;
    }

    return {
      price,
      timestamp: Date.now(),
      source: 'pancakeswap',
    };
  }
}

