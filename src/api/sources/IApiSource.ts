import type { Token } from '@/types';
import type { SourceType } from '@/types';
import type { TokenPrice } from '../endpoints/prices.api';

/**
 * Универсальный интерфейс для API источников
 * Используется для создания плагинной системы добавления новых бирж/источников
 */
export interface IApiSource {
  /**
   * Уникальный идентификатор источника (например, 'jupiter', 'mexc', 'pancakeswap')
   */
  readonly id: SourceType;

  /**
   * Название источника для отображения
   */
  readonly name: string;

  /**
   * Поддерживаемые блокчейны
   */
  readonly supportedChains: ('solana' | 'bsc')[];

  /**
   * Получить список токенов из источника
   * @param signal - AbortSignal для отмены запроса
   * @returns Массив токенов
   */
  getTokens(signal?: AbortSignal): Promise<Token[]>;

  /**
   * Получить цену токена из источника
   * @param symbol - Символ токена (например, 'SOL', 'BNB')
   * @param address - Адрес токена (опционально, требуется для некоторых источников)
   * @param signal - AbortSignal для отмены запроса
   * @returns Цена токена или null, если цена недоступна
   */
  getPrice(
    symbol: string,
    address?: string,
    signal?: AbortSignal
  ): Promise<TokenPrice | null>;

  /**
   * Получить цены для нескольких токенов (batch запрос)
   * @param tokens - Массив токенов
   * @param signal - AbortSignal для отмены запроса
   * @returns Массив цен для токенов
   */
  getPrices(
    tokens: Token[],
    signal?: AbortSignal
  ): Promise<Array<TokenPrice | null>>;

  /**
   * Проверить, поддерживает ли источник указанный блокчейн
   * @param chain - Блокчейн для проверки
   * @returns true, если блокчейн поддерживается
   */
  supportsChain(chain: 'solana' | 'bsc'): boolean;

  /**
   * Проверить, требуется ли адрес токена для получения цены
   * @returns true, если адрес обязателен
   */
  requiresAddress(): boolean;

  /**
   * Получить информацию о rate limits источника
   * @returns Объект с информацией о лимитах (опционально)
   */
  getRateLimitInfo?(): {
    requestsPerSecond?: number;
    requestsPerMinute?: number;
    requestsPerHour?: number;
  };
}

