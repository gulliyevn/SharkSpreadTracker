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
 * Проверяет, что символ является валидным символом токена
 */
export function validateTokenSymbol(
  symbol: string | null | undefined
): boolean {
  if (!symbol) {
    return false;
  }

  const trimmed = symbol.trim();

  // Символ должен быть непустой строкой
  if (trimmed.length === 0) {
    return false;
  }

  // Символ не должен быть только числом (например, "4", "420", "67")
  // Это предотвращает запросы к API с некорректными символами
  if (/^\d+$/.test(trimmed)) {
    return false;
  }

  // Символ не должен начинаться с числа и заканчиваться на USDT (например, "420USDT", "100XUSDT")
  // Это некорректные символы из MEXC API
  if (/^\d+.*USDT$/i.test(trimmed)) {
    return false;
  }

  // Символ не должен начинаться только с цифр без букв (например, "100", "420")
  // Но разрешаем символы, которые начинаются с цифры, но содержат буквы (например, "1INCH", "3CRV")
  if (/^\d+$/i.test(trimmed)) {
    return false;
  }

  // Символ не должен быть коротким и состоять только из цифр и небольшого количества букв
  // (например, "100X" длиной <= 5 символов - подозрительно)
  if (/^\d+[A-Z]{1,2}$/i.test(trimmed) && trimmed.length <= 5) {
    return false;
  }

  // Минимальная длина символа - 2 символа (например, "BTC", "ETH")
  if (trimmed.length < 2) {
    return false;
  }

  // Максимальная длина символа - 20 символов (разумное ограничение)
  if (trimmed.length > 20) {
    return false;
  }

  return true;
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
