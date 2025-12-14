/**
 * Утилиты для форматирования данных
 */

/**
 * Форматирование цены с указанным количеством знаков после запятой
 */
export function formatPrice(
  price: number | null | undefined,
  decimals: number = 2
): string {
  if (price === null || price === undefined) {
    return '—';
  }
  return price.toFixed(decimals);
}

/**
 * Форматирование цены с разделителями тысяч
 */
export function formatPriceWithSeparator(
  price: number | null | undefined,
  decimals: number = 2
): string {
  if (price === null || price === undefined) {
    return '—';
  }
  return price.toLocaleString('ru-RU', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Форматирование процента спреда
 */
export function formatSpread(spread: number | null | undefined): string {
  if (spread === null || spread === undefined) {
    return '—';
  }
  const sign = spread >= 0 ? '+' : '';
  return `${sign}${spread.toFixed(2)}%`;
}

/**
 * Форматирование даты и времени
 */
export function formatDateTime(
  timestamp: number,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = new Date(timestamp);
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'UTC',
  };
  return date.toLocaleString('ru-RU', options || defaultOptions);
}

/**
 * Форматирование времени (только время)
 */
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'UTC',
  });
}

/**
 * Форматирование даты (только дата)
 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'UTC',
  });
}

