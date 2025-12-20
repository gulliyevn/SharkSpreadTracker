import type { Token } from '@/types';
import type { SourceType } from '@/types';
import type { TokenPrice } from '../endpoints/prices.api';
import type { IApiSource } from './IApiSource';
import { logger } from '@/utils/logger';
import { rateLimiter } from '@/utils/security';
import { queuedRequest, RequestPriority } from '@/utils/request-queue';
import { isCanceledError } from '@/utils/errors';

/**
 * Базовый класс для реализации API источников
 * Предоставляет общую функциональность для всех источников:
 * - Rate limiting
 * - Обработка ошибок
 * - Логирование
 * - Queue management
 */
export abstract class BaseApiSource implements IApiSource {
  abstract readonly id: SourceType;
  abstract readonly name: string;
  abstract readonly supportedChains: ('solana' | 'bsc')[];

  /**
   * Rate limit key для этого источника
   * По умолчанию используется `${id}-api`
   */
  protected get rateLimitKey(): string {
    return `${this.id}-api`;
  }

  /**
   * Приоритет запросов для этого источника
   * По умолчанию NORMAL, можно переопределить в наследниках
   */
  protected get requestPriority(): RequestPriority {
    return RequestPriority.NORMAL;
  }

  /**
   * Максимальное количество повторных попыток при ошибке
   * По умолчанию 2, можно переопределить в наследниках
   */
  protected get maxRetries(): number {
    return 2;
  }

  /**
   * Получить список токенов из источника
   * Реализация по умолчанию использует очередь запросов и rate limiting
   */
  async getTokens(signal?: AbortSignal): Promise<Token[]> {
    return queuedRequest(
      async () => {
        // Проверка rate limiting
        if (!rateLimiter.isAllowed(this.rateLimitKey)) {
          logger.warn(`${this.name} API rate limit exceeded`);
          return [];
        }

        try {
          return await this.fetchTokens(signal);
        } catch (error) {
          if (isCanceledError(error)) {
            logger.debug(`${this.name} tokens request was canceled`);
            return [];
          }
          this.handleError('getTokens', error);
          return [];
        }
      },
      {
        priority: this.requestPriority,
        maxRetries: this.maxRetries,
        rateLimitKey: this.rateLimitKey,
      }
    );
  }

  /**
   * Получить цену токена из источника
   * Реализация по умолчанию использует очередь запросов и rate limiting
   */
  async getPrice(
    symbol: string,
    address?: string,
    signal?: AbortSignal
  ): Promise<TokenPrice | null> {
    // Проверка обязательности адреса
    if (this.requiresAddress() && !address) {
      logger.debug(
        `${this.name} price: address required for ${symbol}, returning null`
      );
      return null;
    }

    return queuedRequest(
      async () => {
        // Проверка rate limiting
        if (!rateLimiter.isAllowed(this.rateLimitKey)) {
          logger.warn(`${this.name} API rate limit exceeded`);
          return null;
        }

        try {
          return await this.fetchPrice(symbol, address, signal);
        } catch (error) {
          if (isCanceledError(error)) {
            logger.debug(`${this.name} price request was canceled`);
            return null;
          }
          this.handleError('getPrice', error);
          return null;
        }
      },
      {
        priority: this.requestPriority,
        maxRetries: this.maxRetries,
        rateLimitKey: this.rateLimitKey,
      }
    );
  }

  /**
   * Получить цены для нескольких токенов (batch запрос)
   * Реализация по умолчанию последовательно вызывает getPrice для каждого токена
   * Можно переопределить в наследниках для более эффективной реализации
   */
  async getPrices(
    tokens: Token[],
    signal?: AbortSignal
  ): Promise<Array<TokenPrice | null>> {
    // По умолчанию выполняем запросы последовательно
    // Наследники могут переопределить для batch запросов
    const results = await Promise.allSettled(
      tokens.map((token) =>
        this.getPrice(token.symbol, token.address, signal)
      )
    );

    return results.map((result) =>
      result.status === 'fulfilled' ? result.value : null
    );
  }

  /**
   * Проверить, поддерживает ли источник указанный блокчейн
   */
  supportsChain(chain: 'solana' | 'bsc'): boolean {
    return this.supportedChains.includes(chain);
  }

  /**
   * Проверить, требуется ли адрес токена для получения цены
   * По умолчанию false, можно переопределить в наследниках
   */
  requiresAddress(): boolean {
    return false;
  }

  /**
   * Абстрактный метод для получения токенов из источника
   * Должен быть реализован в наследниках
   */
  protected abstract fetchTokens(signal?: AbortSignal): Promise<Token[]>;

  /**
   * Абстрактный метод для получения цены из источника
   * Должен быть реализован в наследниках
   */
  protected abstract fetchPrice(
    symbol: string,
    address?: string,
    signal?: AbortSignal
  ): Promise<TokenPrice | null>;

  /**
   * Обработка ошибок
   * Можно переопределить в наследниках для кастомной обработки
   */
  protected handleError(operation: string, error: unknown): void {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    logger.error(
      `[${this.name}] Error in ${operation}: ${errorMessage}`,
      error
    );
  }
}

