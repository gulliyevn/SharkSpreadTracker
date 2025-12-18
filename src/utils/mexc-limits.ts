import type { MexcTradingLimits } from '@/types';
import type { MexcSymbol } from '@/api/schemas/mexc.schema';

/**
 * Извлечь лимиты на покупку из filters массива MEXC символа
 * @param symbol - Символ MEXC с filters
 * @returns Лимиты на покупку или null, если не найдены
 */
export function extractMexcLimits(
  symbol: MexcSymbol
): MexcTradingLimits | null {
  if (!symbol.filters || !Array.isArray(symbol.filters)) {
    return null;
  }

  const limits: MexcTradingLimits = {};

  // Ищем MIN_NOTIONAL фильтр
  const minNotionalFilter = symbol.filters.find(
    (f) =>
      f &&
      typeof f === 'object' &&
      'filterType' in f &&
      f.filterType === 'MIN_NOTIONAL'
  );
  if (minNotionalFilter && 'minNotional' in minNotionalFilter) {
    const minNotional = parseFloat(minNotionalFilter.minNotional as string);
    if (!isNaN(minNotional) && minNotional > 0) {
      limits.minNotional = minNotional;
    }
  }

  // Ищем LOT_SIZE фильтр
  const lotSizeFilter = symbol.filters.find(
    (f) =>
      f &&
      typeof f === 'object' &&
      'filterType' in f &&
      f.filterType === 'LOT_SIZE'
  );
  if (lotSizeFilter && 'minQty' in lotSizeFilter) {
    const minQty = parseFloat(lotSizeFilter.minQty as string);
    const maxQty = parseFloat(lotSizeFilter.maxQty as string);
    const stepSize = parseFloat(lotSizeFilter.stepSize as string);

    if (!isNaN(minQty) && minQty > 0) {
      limits.minQty = minQty;
    }
    if (!isNaN(maxQty) && maxQty > 0) {
      limits.maxQty = maxQty;
    }
    if (!isNaN(stepSize) && stepSize > 0) {
      limits.stepSize = stepSize;
    }
  }

  // Возвращаем null, если не найдено ни одного лимита
  if (Object.keys(limits).length === 0) {
    return null;
  }

  return limits;
}
