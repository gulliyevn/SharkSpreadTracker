export const API_CONFIG = {
  TIMEOUT: 30000, // 30 секунд
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 секунда
} as const;

/**
 * URL бэкенда
 * В backend-only режиме фронт общается только с нашим бэкендом
 */
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? '';

/**
 * WebSocket URL для real-time обновлений
 * Endpoint: /socket/sharkStraight
 * Больше нет хардкода IP — URL обязателен через ENV
 */
export const WEBSOCKET_URL =
  import.meta.env.VITE_WEBSOCKET_URL ||
  (BACKEND_URL
    ? `${BACKEND_URL.replace(/^http/, 'ws')}/socket/sharkStraight`
    : '');

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

