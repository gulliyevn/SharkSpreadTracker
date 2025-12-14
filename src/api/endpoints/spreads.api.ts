import type { Token, SpreadResponse, SpreadDataPoint, CurrentData, TimeframeOption } from '@/types';
import { getAllPrices, type AllPrices } from './prices.api';
import { calculateSpread } from '@/utils/calculations';
import { SpreadResponseSchema } from '../schemas';

/**
 * Получить данные спреда для токена
 * @param token - Токен (symbol и chain)
 * @param _timeframe - Таймфрейм для исторических данных (пока не используется)
 * @returns SpreadResponse с текущими и историческими данными
 */
export async function getSpreadData(
  token: Token,
  _timeframe: TimeframeOption = '1h'
): Promise<SpreadResponse> {
  const { symbol, chain } = token;

  // Получаем текущие цены
  const currentPrices = await getAllPrices(token);

  // Формируем текущие данные
  const current: CurrentData = {
    timestamp: currentPrices.timestamp,
    mexc_price: currentPrices.mexc?.price ?? null,
    mexc_bid: currentPrices.mexc?.bid ?? null,
    mexc_ask: currentPrices.mexc?.ask ?? null,
    jupiter_price: currentPrices.jupiter?.price ?? null,
    pancakeswap_price: currentPrices.pancakeswap?.price ?? null,
  };

  // Для исторических данных пока возвращаем пустой массив
  // В будущем можно добавить кэширование и сбор истории
  const history: SpreadDataPoint[] = [];

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
  console.warn('Spread response validation failed:', validated.error);
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
 * Получить спреды для списка токенов
 * @param tokens - Массив токенов
 * @returns Массив токенов с рассчитанными спредами
 */
export async function getSpreadsForTokens(
  tokens: Token[]
): Promise<Array<Token & { directSpread: number | null; reverseSpread: number | null }>> {
  // Получаем цены для всех токенов параллельно (с ограничением)
  const BATCH_SIZE = 10; // Ограничиваем количество параллельных запросов
  const results: Array<Token & { directSpread: number | null; reverseSpread: number | null }> = [];

  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batch = tokens.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map(async (token) => {
        const prices = await getAllPrices(token);
        const spreads = calculateSpreads(prices);
        return {
          ...token,
          directSpread: spreads.directSpread,
          reverseSpread: spreads.reverseSpread,
        };
      })
    );

    batchResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      }
    });
  }

  return results;
}

