/**
 * Утилиты для математических вычислений
 */

/**
 * Расчет процента спреда между двумя ценами
 * Формула: ((price_target - price_source) / price_source) × 100
 *
 * @param priceSource - Цена источника (откуда покупаем)
 * @param priceTarget - Цена назначения (куда продаем)
 * @returns Процент спреда или null, если цены невалидны
 */
export function calculateSpread(
  priceSource: number | null | undefined,
  priceTarget: number | null | undefined
): number | null {
  if (
    priceSource === null ||
    priceSource === undefined ||
    priceTarget === null ||
    priceTarget === undefined
  ) {
    return null;
  }

  if (priceSource === 0) {
    return null; // Деление на ноль
  }

  return ((priceTarget - priceSource) / priceSource) * 100;
}

/**
 * Проверка, является ли спред арбитражной возможностью
 * (положительный спред означает возможность арбитража)
 */
export function isArbitrageOpportunity(spread: number | null): boolean {
  return spread !== null && spread > 0;
}

/**
 * Округление числа до указанного количества знаков после запятой
 * Использует более точный метод для больших чисел
 */
export function roundToDecimals(value: number, decimals: number = 2): number {
  if (!isFinite(value)) {
    return value;
  }

  // Для больших чисел используем более точный метод
  if (Math.abs(value) > 1e15) {
    // Используем toFixed для очень больших чисел
    return parseFloat(value.toFixed(decimals));
  }

  // Для обычных чисел используем стандартный метод
  const multiplier = Math.pow(10, decimals);
  const rounded = Math.round(value * multiplier) / multiplier;

  // Проверяем на потерю точности
  if (!isFinite(rounded)) {
    // Если потеряли точность, используем toFixed
    return parseFloat(value.toFixed(decimals));
  }

  return rounded;
}
