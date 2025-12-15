/**
 * Утилиты для валидации данных
 */

/**
 * Валидация API ключа
 * Проверяет, что ключ не пустой и имеет минимальную длину
 */
export function validateApiKey(apiKey: string | null | undefined): boolean {
  if (!apiKey) {
    return false;
  }
  // Минимальная длина API ключа (можно настроить под требования)
  return apiKey.trim().length >= 10;
}

/**
 * Валидация символа токена
 */
export function validateTokenSymbol(
  symbol: string | null | undefined
): boolean {
  if (!symbol) {
    return false;
  }
  // Символ должен быть непустой строкой
  return symbol.trim().length > 0;
}

/**
 * Валидация цены (должна быть положительным числом)
 */
export function validatePrice(price: number | null | undefined): boolean {
  if (price === null || price === undefined) {
    return false;
  }
  return price > 0 && isFinite(price);
}

/**
 * Валидация timestamp
 */
export function validateTimestamp(timestamp: number): boolean {
  if (timestamp === null || timestamp === undefined || !isFinite(timestamp)) {
    return false;
  }
  // Проверка, что timestamp в разумных пределах (не слишком старый и не из будущего)
  const now = Date.now();
  const minTimestamp = 0; // 1970-01-01
  const maxTimestamp = now + 86400000; // +1 день от текущего времени
  return timestamp >= minTimestamp && timestamp <= maxTimestamp;
}
