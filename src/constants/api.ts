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
 * В dev-режиме используем прокси через Vite для обхода CORS
 * В production используем прямые URL
 */
export const SOURCE_URLS = {
  JUPITER:
    import.meta.env.VITE_JUPITER_URL ||
    (import.meta.env.DEV ? '/api/jupiter' : 'https://api.jup.ag'),
  PANCAKE:
    import.meta.env.VITE_PANCAKE_URL ||
    (import.meta.env.DEV ? '/api/pancake' : 'https://api.dexscreener.com'),
  MEXC:
    import.meta.env.VITE_MEXC_REST_URL ||
    (import.meta.env.DEV ? '/api/mexc' : 'https://api.mexc.com'),
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

/**
 * Флаг для использования mock-данных (для тестирования/разработки)
 * По умолчанию отключен - используем реальные API
 * Можно включить через ENV: VITE_USE_MOCK_DATA=true
 */
export const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';
