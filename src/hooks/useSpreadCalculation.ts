import { useMemo } from 'react';
import { calculateSpread } from '@/utils/calculations';
import type { SpreadDataPoint, CurrentData, SourceType } from '@/types';

/**
 * Интерфейс для результата расчета спреда
 */
export interface SpreadCalculationResult {
  directSpread: number | null;
  reverseSpread: number | null;
  timestamp: number;
}

/**
 * Интерфейс для опций расчета
 */
export interface SpreadCalculationOptions {
  source1: SourceType | null;
  source2: SourceType | null;
  algorithm?: 'standard' | 'weighted' | 'median';
  cacheKey?: string;
}

/**
 * Кэш для расчетов спреда
 * Ключ: `${symbol}-${chain}-${source1}-${source2}-${timestamp}`
 * Значение: SpreadCalculationResult
 */
const calculationCache = new Map<string, SpreadCalculationResult>();

/**
 * Максимальный размер кэша (LRU)
 */
const MAX_CACHE_SIZE = 1000;

/**
 * Получить цену из точки данных по источнику
 */
function getPriceFromDataPoint(
  dataPoint: SpreadDataPoint | CurrentData,
  source: SourceType
): number | null {
  switch (source) {
    case 'mexc':
      return dataPoint.mexc_price;
    case 'jupiter':
      return dataPoint.jupiter_price;
    case 'pancakeswap':
      return dataPoint.pancakeswap_price;
    default:
      return null;
  }
}

/**
 * Стандартный алгоритм расчета спреда
 */
function calculateStandardSpread(
  price1: number | null,
  price2: number | null
): { direct: number | null; reverse: number | null } {
  const direct = calculateSpread(price1, price2);
  const reverse = calculateSpread(price2, price1);
  return { direct, reverse };
}

/**
 * Взвешенный алгоритм расчета (с учетом bid/ask для MEXC)
 */
function calculateWeightedSpread(
  dataPoint: SpreadDataPoint | CurrentData,
  source1: SourceType,
  source2: SourceType
): { direct: number | null; reverse: number | null } {
  const price1 = getPriceFromDataPoint(dataPoint, source1);
  let price2 = getPriceFromDataPoint(dataPoint, source2);

  // Для MEXC используем среднее между bid и ask, если доступно
  if (
    source2 === 'mexc' &&
    'mexc_bid' in dataPoint &&
    'mexc_ask' in dataPoint
  ) {
    const bid = dataPoint.mexc_bid ?? null;
    const ask = dataPoint.mexc_ask ?? null;
    if (bid !== null && ask !== null) {
      price2 = (bid + ask) / 2;
    }
  } else if (
    source1 === 'mexc' &&
    'mexc_bid' in dataPoint &&
    'mexc_ask' in dataPoint
  ) {
    const bid = dataPoint.mexc_bid ?? null;
    const ask = dataPoint.mexc_ask ?? null;
    if (bid !== null && ask !== null) {
      price2 = getPriceFromDataPoint(dataPoint, source2);
      const price1Weighted = (bid + ask) / 2;
      const direct = calculateSpread(price1Weighted, price2);
      const reverse = calculateSpread(price2, price1Weighted);
      return { direct, reverse };
    }
  }

  return calculateStandardSpread(price1, price2);
}

/**
 * Медианный алгоритм (для будущего использования с несколькими источниками)
 */
function calculateMedianSpread(
  price1: number | null,
  price2: number | null
): { direct: number | null; reverse: number | null } {
  // Пока используем стандартный алгоритм
  // В будущем можно добавить медиану по нескольким источникам
  return calculateStandardSpread(price1, price2);
}

/**
 * Очистить старые записи из кэша (LRU)
 */
function cleanupCache(): void {
  if (calculationCache.size > MAX_CACHE_SIZE) {
    // Удаляем первые 100 записей (старейшие)
    const keysToDelete = Array.from(calculationCache.keys()).slice(0, 100);
    keysToDelete.forEach((key) => calculationCache.delete(key));
  }
}

/**
 * Хук для расчета спреда с кэшированием и оптимизацией
 *
 * @param dataPoint - Точка данных (SpreadDataPoint или CurrentData)
 * @param options - Опции расчета
 * @returns Результат расчета спреда
 */
export function useSpreadCalculation(
  dataPoint: SpreadDataPoint | CurrentData | null,
  options: SpreadCalculationOptions
): SpreadCalculationResult | null {
  const { source1, source2, algorithm = 'standard', cacheKey } = options;

  const result = useMemo(() => {
    if (!dataPoint || !source1 || !source2) {
      return null;
    }

    // Генерируем ключ кэша
    const cacheKeyValue =
      cacheKey || `${dataPoint.timestamp}-${source1}-${source2}-${algorithm}`;

    // Проверяем кэш
    const cached = calculationCache.get(cacheKeyValue);
    if (cached) {
      return cached;
    }

    // Рассчитываем спред в зависимости от алгоритма
    let calculationResult: { direct: number | null; reverse: number | null };

    switch (algorithm) {
      case 'weighted':
        calculationResult = calculateWeightedSpread(
          dataPoint,
          source1,
          source2
        );
        break;
      case 'median':
        calculationResult = calculateMedianSpread(
          getPriceFromDataPoint(dataPoint, source1),
          getPriceFromDataPoint(dataPoint, source2)
        );
        break;
      case 'standard':
      default:
        calculationResult = calculateStandardSpread(
          getPriceFromDataPoint(dataPoint, source1),
          getPriceFromDataPoint(dataPoint, source2)
        );
        break;
    }

    const result: SpreadCalculationResult = {
      directSpread: calculationResult.direct,
      reverseSpread: calculationResult.reverse,
      timestamp: dataPoint.timestamp,
    };

    // Сохраняем в кэш
    calculationCache.set(cacheKeyValue, result);
    cleanupCache();

    return result;
  }, [dataPoint, source1, source2, algorithm, cacheKey]);

  return result;
}

/**
 * Хук для расчета спреда для массива точек данных (оптимизация для больших массивов)
 *
 * @param dataPoints - Массив точек данных
 * @param options - Опции расчета
 * @returns Массив результатов расчета
 */
export function useSpreadCalculations(
  dataPoints: (SpreadDataPoint | CurrentData)[],
  options: SpreadCalculationOptions
): SpreadCalculationResult[] {
  const { source1, source2, algorithm = 'standard' } = options;

  return useMemo(() => {
    if (!source1 || !source2 || dataPoints.length === 0) {
      return [];
    }

    // Используем batch processing для оптимизации
    const BATCH_SIZE = 50;
    const results: SpreadCalculationResult[] = [];

    for (let i = 0; i < dataPoints.length; i += BATCH_SIZE) {
      const batch = dataPoints.slice(i, i + BATCH_SIZE);
      const batchResults = batch
        .map((dataPoint) => {
          const cacheKey = `${dataPoint.timestamp}-${source1}-${source2}-${algorithm}`;
          const cached = calculationCache.get(cacheKey);
          if (cached) {
            return cached;
          }

          let calculationResult: {
            direct: number | null;
            reverse: number | null;
          };

          switch (algorithm) {
            case 'weighted':
              calculationResult = calculateWeightedSpread(
                dataPoint,
                source1,
                source2
              );
              break;
            case 'median':
              calculationResult = calculateMedianSpread(
                getPriceFromDataPoint(dataPoint, source1),
                getPriceFromDataPoint(dataPoint, source2)
              );
              break;
            case 'standard':
            default:
              calculationResult = calculateStandardSpread(
                getPriceFromDataPoint(dataPoint, source1),
                getPriceFromDataPoint(dataPoint, source2)
              );
              break;
          }

          const result: SpreadCalculationResult = {
            directSpread: calculationResult.direct,
            reverseSpread: calculationResult.reverse,
            timestamp: dataPoint.timestamp,
          };

          calculationCache.set(cacheKey, result);
          return result;
        })
        .filter((r): r is SpreadCalculationResult => r !== null);

      results.push(...batchResults);
    }

    cleanupCache();
    return results;
  }, [dataPoints, source1, source2, algorithm]);
}

/**
 * Очистить кэш расчетов (для тестирования или при необходимости)
 */
export function clearSpreadCalculationCache(): void {
  calculationCache.clear();
}
