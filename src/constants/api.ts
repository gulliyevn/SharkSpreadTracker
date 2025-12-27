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
export const WEBSOCKET_URL = (() => {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/98107816-f1a6-4cf2-9ef8-59354928d2ee', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: 'api.ts:30',
      message: 'WEBSOCKET_URL formation start',
      data: {
        hasViteWebsocketUrl: !!import.meta.env.VITE_WEBSOCKET_URL,
        viteWebsocketUrl: import.meta.env.VITE_WEBSOCKET_URL,
        hasBackendUrl: !!BACKEND_URL,
        backendUrl: BACKEND_URL,
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'A',
    }),
  }).catch(() => {});
  // #endregion
  // Если явно указан VITE_WEBSOCKET_URL, используем его
  // ВАЖНО: Принудительно заменяем wss:// на ws://, так как сервер не поддерживает SSL
  if (import.meta.env.VITE_WEBSOCKET_URL) {
    const url = import.meta.env.VITE_WEBSOCKET_URL;
    // Принудительно заменяем wss:// на ws:// для серверов без SSL
    const finalUrl = url.replace(/^wss:\/\//, 'ws://');
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/98107816-f1a6-4cf2-9ef8-59354928d2ee', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'api.ts:36',
        message: 'WEBSOCKET_URL from VITE_WEBSOCKET_URL',
        data: { originalUrl: url, finalUrl },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'A',
      }),
    }).catch(() => {});
    // #endregion
    return finalUrl;
  }

  // Если BACKEND_URL не установлен, возвращаем пустую строку
  if (!BACKEND_URL) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/98107816-f1a6-4cf2-9ef8-59354928d2ee', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'api.ts:42',
        message: 'WEBSOCKET_URL empty - BACKEND_URL not set',
        data: {},
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'A',
      }),
    }).catch(() => {});
    // #endregion
    return '';
  }

  // Формируем WebSocket URL из BACKEND_URL
  // Заменяем http:// или https:// на ws:// (явно указываем ws:// для серверов без SSL)
  const wsUrl = BACKEND_URL.replace(/^https?:\/\//, 'ws://');
  const finalUrl = `${wsUrl}/socket/sharkStraight`;
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/98107816-f1a6-4cf2-9ef8-59354928d2ee', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: 'api.ts:49',
      message: 'WEBSOCKET_URL from BACKEND_URL',
      data: { backendUrl: BACKEND_URL, wsUrl, finalUrl },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'A',
    }),
  }).catch(() => {});
  // #endregion
  return finalUrl;
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
