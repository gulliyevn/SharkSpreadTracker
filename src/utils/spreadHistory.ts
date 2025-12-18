import type { SpreadDataPoint, Token, TimeframeOption } from '@/types';
import { TIMEFRAMES } from '@/constants/timeframes';

/**
 * Ключ для localStorage
 */
function getStorageKey(token: Token, timeframe: TimeframeOption): string {
  return `spread-history-${token.symbol}-${token.chain}-${timeframe}`;
}

/**
 * Максимальное количество точек данных для каждого таймфрейма
 */
const MAX_POINTS: Record<TimeframeOption, number> = {
  '1m': 60, // 1 час данных
  '5m': 72, // 6 часов данных
  '15m': 96, // 24 часа данных
  '1h': 168, // 7 дней данных
  '4h': 180, // 30 дней данных
  '1d': 365, // 1 год данных
};

/**
 * Интервал для сохранения точек (в миллисекундах)
 */
const SAVE_INTERVALS: Record<TimeframeOption, number> = {
  '1m': 60 * 1000, // 1 минута
  '5m': 5 * 60 * 1000, // 5 минут
  '15m': 15 * 60 * 1000, // 15 минут
  '1h': 60 * 60 * 1000, // 1 час
  '4h': 4 * 60 * 60 * 1000, // 4 часа
  '1d': 24 * 60 * 60 * 1000, // 1 день
};

/**
 * Сохранить точку данных в историю
 * @param token - Токен
 * @param timeframe - Таймфрейм
 * @param dataPoint - Точка данных для сохранения
 */
export function saveSpreadHistoryPoint(
  token: Token,
  timeframe: TimeframeOption,
  dataPoint: SpreadDataPoint
): void {
  try {
    const key = getStorageKey(token, timeframe);
    const existing = loadSpreadHistory(token, timeframe);

    // Проверяем, нужно ли сохранять (по интервалу)
    if (existing.length > 0) {
      const lastPoint = existing[existing.length - 1];
      if (lastPoint) {
        const interval = SAVE_INTERVALS[timeframe];
        const timeDiff = dataPoint.timestamp - lastPoint.timestamp;

        // Если прошло недостаточно времени, не сохраняем
        if (timeDiff < interval) {
          return;
        }
      }
    }

    // Добавляем новую точку
    const updated = [...existing, dataPoint];

    // Ограничиваем количество точек
    const maxPoints = MAX_POINTS[timeframe];
    const trimmed = updated.slice(-maxPoints);

    // Сохраняем в localStorage
    localStorage.setItem(key, JSON.stringify(trimmed));
  } catch (error) {
    console.error('Failed to save spread history point:', error);
  }
}

/**
 * Загрузить историю спреда из localStorage
 * @param token - Токен
 * @param timeframe - Таймфрейм
 * @returns Массив точек данных
 */
export function loadSpreadHistory(
  token: Token,
  timeframe: TimeframeOption
): SpreadDataPoint[] {
  try {
    const key = getStorageKey(token, timeframe);
    const stored = localStorage.getItem(key);

    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored) as SpreadDataPoint[];

    // Валидация: проверяем что это массив
    if (!Array.isArray(parsed)) {
      return [];
    }

    // Фильтруем старые точки (старше чем нужно для таймфрейма)
    const timeframeMinutes = TIMEFRAMES[timeframe].minutes;
    const maxAge = timeframeMinutes * 60 * 1000 * MAX_POINTS[timeframe];
    const now = Date.now();
    const filtered = parsed.filter((point) => now - point.timestamp <= maxAge);

    // Если отфильтровали точки, сохраняем обновленный список
    if (filtered.length !== parsed.length) {
      localStorage.setItem(key, JSON.stringify(filtered));
    }

    return filtered;
  } catch (error) {
    console.error('Failed to load spread history:', error);
    return [];
  }
}

/**
 * Очистить историю для токена
 * @param token - Токен
 * @param timeframe - Таймфрейм (опционально, если не указан - очищает все таймфреймы)
 */
export function clearSpreadHistory(
  token: Token,
  timeframe?: TimeframeOption
): void {
  try {
    if (timeframe) {
      const key = getStorageKey(token, timeframe);
      localStorage.removeItem(key);
    } else {
      // Очищаем все таймфреймы
      const timeframes: TimeframeOption[] = [
        '1m',
        '5m',
        '15m',
        '1h',
        '4h',
        '1d',
      ];
      timeframes.forEach((tf) => {
        const key = getStorageKey(token, tf);
        localStorage.removeItem(key);
      });
    }
  } catch (error) {
    console.error('Failed to clear spread history:', error);
  }
}

/**
 * Получить историю для всех таймфреймов
 * @param token - Токен
 * @returns Объект с историей для каждого таймфрейма
 */
export function loadAllSpreadHistory(
  token: Token
): Record<TimeframeOption, SpreadDataPoint[]> {
  const timeframes: TimeframeOption[] = ['1m', '5m', '15m', '1h', '4h', '1d'];
  const result: Record<string, SpreadDataPoint[]> = {};

  timeframes.forEach((timeframe) => {
    result[timeframe] = loadSpreadHistory(token, timeframe);
  });

  return result as Record<TimeframeOption, SpreadDataPoint[]>;
}

/**
 * Обновить историю при получении новых данных
 * @param token - Токен
 * @param currentData - Текущие данные
 * @param timeframe - Таймфрейм
 */
export function updateSpreadHistory(
  token: Token,
  currentData: SpreadDataPoint,
  timeframe: TimeframeOption
): void {
  saveSpreadHistoryPoint(token, timeframe, currentData);
}
