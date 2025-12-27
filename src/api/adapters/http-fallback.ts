/**
 * HTTP fallback для случая, когда WebSocket не обновился
 * Согласно документации API, если WebSocket не обновился, бэкенд возвращает HTTP 200 с JSON
 */

import { logger } from '@/utils/logger';
import { BACKEND_URL } from '@/constants/api';
import { parseWebSocketMessage } from './utils/websocket-client';
import type { WebSocketParams } from './utils/websocket-client';
import type { StraightData } from '@/types';

const HTTP_FALLBACK_TIMEOUT = 10000; // 10 секунд - таймаут для HTTP fallback запроса

export async function fetchStraightSpreadsHttpFallback(
  url: URL,
  params: WebSocketParams
): Promise<StraightData[]> {
  // Простая логика: используем BACKEND_URL напрямую
  if (!BACKEND_URL) {
    logger.error('[HTTP Fallback] BACKEND_URL not configured');
    return [];
  }

  // На production или HTTPS страницах используем прокси через Vercel Edge Function
  // На localhost в dev режиме используем прокси через Vite
  const isDev = import.meta.env.DEV;
  const isProduction = import.meta.env.PROD;
  const isHttps =
    typeof window !== 'undefined' && window.location.protocol === 'https:';
  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1');

  let httpUrl: URL;
  // Если url уже относительный (начинается с /), используем его напрямую
  // Это означает, что мы на production/HTTPS и используем прокси
  if (url.pathname.startsWith('/api/backend')) {
    // URL уже правильный (относительный путь к прокси)
    httpUrl = new URL(url.pathname, window.location.origin);
    // Копируем query параметры
    url.searchParams.forEach((value, key) => {
      httpUrl.searchParams.set(key, value);
    });
  } else if (isProduction || isHttps || (isDev && isLocalhost)) {
    // Используем прокси через Vercel Edge Function (production) или Vite (localhost)
    httpUrl = new URL(
      '/api/backend/socket/sharkStraight',
      window.location.origin
    );
    // Добавляем query параметры из WebSocket URL
    url.searchParams.forEach((value, key) => {
      httpUrl.searchParams.set(key, value);
    });
  } else {
    // Fallback: используем прямой URL (не должно использоваться на production)
    httpUrl = new URL(`${BACKEND_URL}/socket/sharkStraight`);
    // Добавляем query параметры из WebSocket URL
    url.searchParams.forEach((value, key) => {
      httpUrl.searchParams.set(key, value);
    });
  }

  logger.info(
    `[HTTP Fallback] Trying HTTP GET request to: ${httpUrl.toString()}`
  );
  console.log('[HTTP Fallback] 🔍 Request URL:', httpUrl.toString());
  console.log('[HTTP Fallback] 🔍 Is Production:', isProduction);
  console.log('[HTTP Fallback] 🔍 Is HTTPS:', isHttps);
  console.log('[HTTP Fallback] 🔍 BACKEND_URL:', BACKEND_URL);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      HTTP_FALLBACK_TIMEOUT
    );

    if (params.signal) {
      params.signal.addEventListener('abort', () => controller.abort(), {
        once: true,
      });
    }

    console.log('[HTTP Fallback] 📤 Sending fetch request...');
    const response = await fetch(httpUrl.toString(), {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    clearTimeout(timeoutId);
    console.log('[HTTP Fallback] 📥 Response status:', response.status);
    console.log('[HTTP Fallback] 📥 Response ok:', response.ok);
    console.log(
      '[HTTP Fallback] 📥 Response headers:',
      Object.fromEntries(response.headers.entries())
    );

    if (!response.ok) {
      // HTTP 426 (Upgrade Required) означает, что сервер требует WebSocket
      // Это нормально для endpoint /socket/sharkStraight
      if (response.status === 426) {
        logger.debug(
          '[HTTP Fallback] Server requires WebSocket (426 Upgrade Required). This is expected for /socket/sharkStraight endpoint.'
        );
      } else {
        logger.warn(
          `[HTTP Fallback] HTTP request failed with status ${response.status}`
        );
      }
      return [];
    }

    const data = await response.json();
    console.log('[HTTP Fallback] ✅ Received data:', {
      type: Array.isArray(data) ? 'array' : typeof data,
      length: Array.isArray(data) ? data.length : 'N/A',
      preview: Array.isArray(data) && data.length > 0 ? data[0] : data,
    });
    logger.info('[HTTP Fallback] Received data via HTTP:', {
      type: Array.isArray(data) ? 'array' : typeof data,
      length: Array.isArray(data) ? data.length : 1,
    });

    // Парсим данные так же, как WebSocket сообщения
    // parseWebSocketMessage ожидает строку, поэтому преобразуем JSON обратно в строку
    const rows = parseWebSocketMessage(JSON.stringify(data));
    console.log('[HTTP Fallback] ✅ Parsed rows:', rows.length);

    logger.info(
      `[HTTP Fallback] Successfully parsed ${rows.length} rows from HTTP response`
    );
    return rows;
  } catch (err) {
    console.error('[HTTP Fallback] ❌ Error:', err);
    if (err instanceof Error && err.name === 'AbortError') {
      logger.debug('[HTTP Fallback] Request aborted');
      console.log('[HTTP Fallback] ⏱️ Request was aborted (timeout)');
    } else {
      logger.error('[HTTP Fallback] HTTP request failed:', err);
      console.error(
        '[HTTP Fallback] ❌ Request failed:',
        err instanceof Error ? err.message : String(err)
      );
    }
    return [];
  }
}
