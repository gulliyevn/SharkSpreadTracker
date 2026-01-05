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
 * ВАЖНО: Для production (HTTPS) требуется wss:// (WebSocket Secure).
 * Если BACKEND_URL начинается с https://, автоматически формируется wss:// URL.
 * Если BACKEND_URL начинается с http://, формируется ws:// URL (для localhost).
 *
 * Примечание: Когда бэкенд реализует /socket/sharkReverse, будет создана аналогичная
 * константа REVERSE_WEBSOCKET_URL для обратного спреда
 */
export const WEBSOCKET_URL = (() => {
  // ВАЖНО: Если установлен VITE_WEBSOCKET_URL, используем его напрямую
  // Это позволяет использовать прямой WebSocket URL на production и localhost
  if (import.meta.env.VITE_WEBSOCKET_URL) {
    return import.meta.env.VITE_WEBSOCKET_URL;
  }

  // Если BACKEND_URL установлен, формируем WebSocket URL из него
  if (BACKEND_URL) {
    // Преобразуем http:// или https:// в ws:// или wss://
    // ВАЖНО: Для production используем wss:// если BACKEND_URL начинается с https://
    const wsUrl = BACKEND_URL.replace(/^https:\/\//, 'wss://').replace(
      /^http:\/\//,
      'ws://'
    );
    return `${wsUrl}/socket/sharkStraight`;
  }

  return '';
})();

/**
 * Интервалы обновления данных (в миллисекундах)
 * Оптимизированы для снижения нагрузки на API
 */
export const REFRESH_INTERVALS = {
  SPREAD_DATA: 3000, // 3 секунды - спреды обновляются очень часто, чтобы не пропустить изменения
  TOKENS: 15000, // 15 секунд - токены обновляются часто, чтобы не пропустить изменения спреда
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
  FAVORITE_TOKENS: 'shark_favorite_tokens', // Избранные токены (Set<string> сериализованный как массив)
} as const;
