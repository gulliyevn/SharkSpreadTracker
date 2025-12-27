export const API_CONFIG = {
  TIMEOUT: 30000, // 30 секунд
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 секунда
} as const;

/**
 * URL бэкенда
 * В backend-only режиме фронт общается только с нашим бэкендом
 *
 * ВАЖНО: Для production на Vercel необходимо установить переменную окружения VITE_BACKEND_URL
 * в настройках проекта Vercel (Settings -> Environment Variables)
 */
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? '';

/**
 * WebSocket URL для real-time обновлений
 * Endpoint: /socket/sharkStraight
 *
 * Простая логика: используем VITE_WEBSOCKET_URL если установлен,
 * иначе формируем из BACKEND_URL
 *
 * ВАЖНО: Явно указываем ws:// протокол, даже если страница загружена по HTTPS.
 * Браузер не может автоматически преобразовать ws:// в wss://, поэтому
 * мы явно используем ws:// для серверов без SSL.
 *
 * Примечание: Когда бэкенд реализует /socket/sharkReverse, будет создана аналогичная
 * константа REVERSE_WEBSOCKET_URL для обратного спреда
 */
/**
 * ВАЖНО: На HTTPS страницах браузер блокирует ws:// соединения (Mixed Content Policy).
 * Решение: использовать HTTP fallback через Vercel Edge Function (/api/backend).
 * На production всегда используем HTTP fallback через прокси.
 */
export const WEBSOCKET_URL = (() => {
  // ВАЖНО: Если установлен VITE_WEBSOCKET_URL, используем его напрямую
  // Это позволяет использовать прямой WebSocket URL даже на production
  if (import.meta.env.VITE_WEBSOCKET_URL) {
    return import.meta.env.VITE_WEBSOCKET_URL;
  }

  // Если BACKEND_URL установлен, формируем WebSocket URL из него
  if (BACKEND_URL) {
    // Преобразуем http:// или https:// в ws:// или wss://
    const wsUrl = BACKEND_URL.replace(/^https:\/\//, 'wss://').replace(
      /^http:\/\//,
      'ws://'
    );
    return `${wsUrl}/socket/sharkStraight`;
  }

  // Fallback: используем относительный путь через прокси (HTTP fallback)
  // Это используется только если VITE_WEBSOCKET_URL и BACKEND_URL не установлены
  const isProduction = import.meta.env.PROD;
  const isHttps =
    typeof window !== 'undefined' && window.location.protocol === 'https:';
  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1');
  const isDev = import.meta.env.DEV;

  if (isProduction || isHttps || (isDev && isLocalhost)) {
    // Используем относительный URL для HTTP fallback через прокси
    return '/api/backend/socket/sharkStraight';
  }

  return '';
})();

/**
 * Интервалы обновления данных (в миллисекундах)
 * Оптимизированы для снижения нагрузки на API
 */
export const REFRESH_INTERVALS = {
  SPREAD_DATA: 30000, // 30 секунд (было 10 секунд) - спреды обновляются реже
  TOKENS: 120000, // 2 минуты (было 1 минута) - список токенов обновляется реже
} as const;

/**
 * Ключи для localStorage
 */
export const STORAGE_KEYS = {
  API_KEY: 'shark_api_key',
  SELECTED_TOKEN: 'shark_selected_token',
  SELECTED_TIMEFRAME: 'shark_selected_timeframe',
  SELECTED_SOURCES: 'shark_selected_sources',
  THEME: 'shark_theme',
  LANGUAGE: 'i18nextLng', // i18next использует этот ключ по умолчанию
} as const;
