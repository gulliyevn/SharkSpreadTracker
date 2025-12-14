/**
 * API константы
 * Данные получаем напрямую из источников, без бэкенда
 */

export const API_CONFIG = {
  TIMEOUT: 30000, // 30 секунд
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 секунда
} as const;

/**
 * URL источников данных
 */
export const SOURCE_URLS = {
  JUPITER: import.meta.env.VITE_JUPITER_URL || 'https://lite-api.jup.ag',
  PANCAKE: import.meta.env.VITE_PANCAKE_URL || 'https://api.dexscreener.com/latest/dex/tokens',
  MEXC: import.meta.env.VITE_MEXC_REST_URL || 'https://contract.mexc.com',
} as const;

/**
 * Интервалы обновления данных (в миллисекундах)
 */
export const REFRESH_INTERVALS = {
  SPREAD_DATA: 10000, // 10 секунд
  TOKENS: 60000, // 1 минута
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

