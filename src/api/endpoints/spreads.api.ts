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
import { networkMonitor } from '@/utils/network-monitor';

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
    // Для Solana: Jupiter -> MEXC
    source1Price = jupiter?.price ?? null;
    source2Price = mexc?.price ?? null;
    source1 = 'jupiter';
    source2 = 'mexc';
  } else if (chain === 'bsc') {
    // Для BSC: PancakeSwap -> MEXC
    source1Price = pancakeswap?.price ?? null;
    source2Price = mexc?.price ?? null;
    source1 = 'pancakeswap';
    source2 = 'mexc';
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
 * @param tokens - Массив токенов
 * @param signal - AbortSignal для отмены запросов (опционально)
 * @param maxTokens - Максимальное количество токенов для обработки (по умолчанию 100)
 * @returns Массив токенов с рассчитанными спредами и ценами
 */
export async function getSpreadsForTokens(
  tokens: Token[],
  signal?: AbortSignal,
  maxTokens: number = 100
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
  
  // Ограничиваем количество токенов для обработки
  const tokensToProcess = validTokens.slice(0, maxTokens);
  logger.info(
    `Getting spreads for ${tokensToProcess.length} tokens (out of ${validTokens.length} valid, ${tokens.length} total)`
  );

  // Получаем цены для всех токенов параллельно (с ограничением)
  // Адаптируем размер батча в зависимости от состояния сети
  const BATCH_SIZE = networkMonitor.isSlowNetwork() ? 5 : 10; // Меньше параллельных запросов на медленных сетях
  const results: Array<
    Token & {
      directSpread: number | null;
      reverseSpread: number | null;
      price: number | null;
    }
  > = [];

  for (let i = 0; i < tokensToProcess.length; i += BATCH_SIZE) {
    const batch = tokensToProcess.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map(async (token) => {
        const prices = await getAllPrices(token, signal);
        const spreads = calculateSpreads(prices);

        // Получаем среднюю цену из доступных источников
        const priceSources = [
          prices.mexc?.price,
          prices.jupiter?.price,
          prices.pancakeswap?.price,
        ].filter((p): p is number => p !== null && p !== undefined);

        const avgPrice =
          priceSources.length > 0
            ? priceSources.reduce((sum, p) => sum + p, 0) / priceSources.length
            : null;

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
      }
    });

    // Логируем прогресс
    if ((i + BATCH_SIZE) % 50 === 0 || i + BATCH_SIZE >= tokensToProcess.length) {
      logger.debug(
        `Processed ${Math.min(i + BATCH_SIZE, tokensToProcess.length)}/${tokensToProcess.length} tokens`
      );
    }
  }

  logger.info(`Successfully processed ${results.length} tokens with spreads and prices`);
  return results;
}
