import type {
  Token,
  SpreadResponse,
  SpreadDataPoint,
  CurrentData,
  TimeframeOption,
} from '@/types';
import { getAllPrices, type AllPrices } from './prices.api';
import { calculateSpread } from '@/utils/calculations';
import { SpreadResponseSchema } from '../schemas';
import { logger } from '@/utils/logger';
import { loadSpreadHistory, updateSpreadHistory } from '@/utils/spreadHistory';
import { validateTokenSymbol } from '@/utils/validation';

/**
 * Получить данные спреда для токена
 * @param token - Токен (symbol и chain)
 * @param timeframe - Таймфрейм для исторических данных
 * @param signal - AbortSignal для отмены запросов (опционально)
 * @returns SpreadResponse с текущими и историческими данными
 */
export async function getSpreadData(
  token: Token,
  timeframe: TimeframeOption = '1h',
  signal?: AbortSignal
): Promise<SpreadResponse> {
  const { symbol, chain } = token;

  // Получаем текущие цены
  const currentPrices = await getAllPrices(token, signal);

  // Формируем текущие данные
  const current: CurrentData = {
    timestamp: currentPrices.timestamp,
    mexc_price: currentPrices.mexc?.price ?? null,
    mexc_bid: currentPrices.mexc?.bid ?? null,
    mexc_ask: currentPrices.mexc?.ask ?? null,
    jupiter_price: currentPrices.jupiter?.price ?? null,
    pancakeswap_price: currentPrices.pancakeswap?.price ?? null,
  };

  // Сохраняем текущие данные в историю
  const currentDataPoint: SpreadDataPoint = {
    timestamp: current.timestamp,
    mexc_price: current.mexc_price,
    mexc_bid: current.mexc_bid,
    mexc_ask: current.mexc_ask,
    jupiter_price: current.jupiter_price,
    pancakeswap_price: current.pancakeswap_price,
  };

  // Сохраняем историю асинхронно (не ждем завершения)
  updateSpreadHistory(token, currentDataPoint, timeframe).catch((error) => {
    logger.error('Failed to update spread history:', error);
  });

  // Загружаем историю из IndexedDB (или localStorage как fallback)
  const history: SpreadDataPoint[] = await loadSpreadHistory(token, timeframe);

  // Определяем доступность источников
  const sources = {
    mexc: currentPrices.mexc !== null,
    jupiter: currentPrices.jupiter !== null,
    pancakeswap: currentPrices.pancakeswap !== null,
  };

  const response: SpreadResponse = {
    symbol,
    chain,
    history,
    current,
    sources,
  };

  // Валидация через Zod
  const validated = SpreadResponseSchema.safeParse(response);
  if (validated.success) {
    return validated.data;
  }

  // Если валидация не прошла, возвращаем исходный ответ
  logger.warn('Spread response validation failed:', validated.error);
  return response;
}

/**
 * Рассчитать спреды между источниками
 * @param prices - Все цены токена
 * @returns Объект с direct и reverse спредами
 */
export function calculateSpreads(prices: AllPrices): {
  directSpread: number | null;
  reverseSpread: number | null;
  source1: string;
  source2: string;
} {
  const { jupiter, pancakeswap, mexc, chain } = prices;

  // Определяем источники в зависимости от блокчейна
  let source1Price: number | null = null;
  let source2Price: number | null = null;
  let source1: string = '';
  let source2: string = '';

  if (chain === 'solana') {
    // Для Solana: Jupiter (Solana DEX) -> MEXC (Solana токен на бирже)
    source1Price = jupiter?.price ?? null;
    source2Price = mexc?.price ?? null;
    source1 = 'jupiter';
    source2 = 'mexc';
    
    // Логируем для диагностики
    if (import.meta.env.DEV && prices.symbol) {
      logger.debug(`[calculateSpreads] Solana token ${prices.symbol}:`, {
        jupiter: jupiter?.price,
        mexc: mexc?.price,
        hasJupiter: !!jupiter,
        hasMexc: !!mexc,
      });
    }
  } else if (chain === 'bsc') {
    // Для BSC: PancakeSwap (BSC DEX) -> MEXC (BSC токен на бирже)
    source1Price = pancakeswap?.price ?? null;
    source2Price = mexc?.price ?? null;
    source1 = 'pancakeswap';
    source2 = 'mexc';
    
    // Логируем для диагностики
    if (import.meta.env.DEV && prices.symbol) {
      logger.debug(`[calculateSpreads] BSC token ${prices.symbol}:`, {
        pancakeswap: pancakeswap?.price,
        mexc: mexc?.price,
        hasPancake: !!pancakeswap,
        hasMexc: !!mexc,
      });
    }
  }

  // Рассчитываем спреды
  const directSpread = calculateSpread(source1Price, source2Price);
  const reverseSpread = calculateSpread(source2Price, source1Price);

  return {
    directSpread,
    reverseSpread,
    source1,
    source2,
  };
}

/**
 * Получить спреды и цены для списка токенов
 * БЕЗ ЛИМИТОВ - обрабатываем ВСЕ токены
 * @param tokens - Массив токенов
 * @param signal - AbortSignal для отмены запросов (опционально)
 * @param maxTokens - НЕ ИСПОЛЬЗУЕТСЯ (оставлен для обратной совместимости)
 * @returns Массив токенов с рассчитанными спредами и ценами
 */
export async function getSpreadsForTokens(
  tokens: Token[],
  signal?: AbortSignal,
  _maxTokens?: number // Не используется, но оставлен для обратной совместимости
): Promise<
  Array<
    Token & {
      directSpread: number | null;
      reverseSpread: number | null;
      price: number | null;
    }
  >
> {
  // Фильтруем токены с некорректными символами перед обработкой
  const validTokens = tokens.filter((token) => validateTokenSymbol(token.symbol));
  const invalidCount = tokens.length - validTokens.length;
  if (invalidCount > 0) {
    const invalidSymbols = tokens
      .filter((token) => !validateTokenSymbol(token.symbol))
      .map((t) => t.symbol)
      .slice(0, 10); // Показываем первые 10 некорректных символов
    logger.warn(
      `Filtered out ${invalidCount} tokens with invalid symbols: ${invalidSymbols.join(', ')}${invalidCount > 10 ? '...' : ''}`
    );
  }
  
  // БЕЗ ЛИМИТОВ - обрабатываем ВСЕ валидные токены
  const tokensToProcess = validTokens;
  logger.info(
    `Getting spreads for ALL ${tokensToProcess.length} tokens (out of ${validTokens.length} valid, ${tokens.length} total) - NO LIMITS`
  );

  // Получаем цены для всех токенов параллельно (с ограничением)
  // Адаптируем размер батча в зависимости от состояния сети
  // БЕЗ БАТЧИНГА - обрабатываем все токены параллельно
  // Но ограничиваем параллельность для избежания перегрузки API
  const MAX_CONCURRENT = 20; // Максимальное количество параллельных запросов
  const results: Array<
    Token & {
      directSpread: number | null;
      reverseSpread: number | null;
      price: number | null;
    }
  > = [];

  // Сбрасываем счетчик логирования при начале новой обработки
  if (import.meta.env.DEV) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).__getSpreadsLogCount = 0;
  }

  // Обрабатываем все токены параллельно, но с ограничением на количество одновременных запросов
  for (let i = 0; i < tokensToProcess.length; i += MAX_CONCURRENT) {
    const batch = tokensToProcess.slice(i, i + MAX_CONCURRENT);
    const batchResults = await Promise.allSettled(
      batch.map(async (token) => {
        const prices = await getAllPrices(token, signal);
        const spreads = calculateSpreads(prices);

        // Получаем среднюю цену из доступных источников
        // ВАЖНО: Для правильного сравнения используем только цены из источников той же сети
        // Для Solana: Jupiter и MEXC (если есть)
        // Для BSC: PancakeSwap и MEXC (если есть)
        const priceSources: number[] = [];
        
        if (token.chain === 'solana') {
          // Для Solana используем Jupiter и MEXC
          if (prices.jupiter?.price) priceSources.push(prices.jupiter.price);
          if (prices.mexc?.price) priceSources.push(prices.mexc.price);
        } else if (token.chain === 'bsc') {
          // Для BSC используем PancakeSwap и MEXC
          if (prices.pancakeswap?.price) priceSources.push(prices.pancakeswap.price);
          if (prices.mexc?.price) priceSources.push(prices.mexc.price);
        }

        const avgPrice =
          priceSources.length > 0
            ? priceSources.reduce((sum, p) => sum + p, 0) / priceSources.length
            : null;

        // Логируем для диагностики (только для первых нескольких токенов)
        // Используем счетчик, так как results.length может быть неактуальным во время выполнения
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const logCount = ((globalThis as any).__getSpreadsLogCount as number) || 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).__getSpreadsLogCount = logCount + 1;
        
        if (import.meta.env.DEV && logCount < 5) {
          logger.debug(`[getSpreadsForTokens] Price calculation for ${token.symbol} (${token.chain}):`, {
            mexc: prices.mexc?.price,
            jupiter: prices.jupiter?.price,
            pancakeswap: prices.pancakeswap?.price,
            priceSources,
            avgPrice,
            priceSourcesCount: priceSources.length,
            allPricesNull: !prices.mexc?.price && !prices.jupiter?.price && !prices.pancakeswap?.price,
          });
        }

        return {
          ...token,
          directSpread: spreads.directSpread,
          reverseSpread: spreads.reverseSpread,
          price: avgPrice,
        };
      })
    );

    batchResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else if (result.status === 'rejected') {
        // Логируем ошибки для диагностики
        if (import.meta.env.DEV) {
          logger.warn(`[getSpreadsForTokens] Failed to get spreads for token in batch:`, {
            error: result.reason,
            batchIndex: i,
          });
        }
      }
    });

    // Логируем прогресс
    if ((i + MAX_CONCURRENT) % 50 === 0 || i + MAX_CONCURRENT >= tokensToProcess.length) {
      logger.debug(
        `Processed ${Math.min(i + MAX_CONCURRENT, tokensToProcess.length)}/${tokensToProcess.length} tokens`
      );
    }
  }

  logger.info(`Successfully processed ${results.length} tokens with spreads and prices`);
  return results;
}
