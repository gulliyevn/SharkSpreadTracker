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

  // На localhost в dev режиме используем прокси через Vite
  const isDev = import.meta.env.DEV;
  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1');

  let httpUrl: URL;
  if (isDev && isLocalhost) {
    // Используем прокси через Vite на localhost
    httpUrl = new URL(
      '/api/backend/socket/sharkStraight',
      window.location.origin
    );
  } else {
    // На production используем прямой URL
    httpUrl = new URL(`${BACKEND_URL}/socket/sharkStraight`);
  }

  // Добавляем query параметры из WebSocket URL
  url.searchParams.forEach((value, key) => {
    httpUrl.searchParams.set(key, value);
  });

  logger.info(
    `[HTTP Fallback] Trying HTTP GET request to: ${httpUrl.toString()}`
  );

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

    const response = await fetch(httpUrl.toString(), {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      logger.warn(
        `[HTTP Fallback] HTTP request failed with status ${response.status}`
      );
      return [];
    }

    const data = await response.json();
    logger.info('[HTTP Fallback] Received data via HTTP:', {
      type: Array.isArray(data) ? 'array' : typeof data,
      length: Array.isArray(data) ? data.length : 1,
    });

    // Парсим данные так же, как WebSocket сообщения
    // parseWebSocketMessage ожидает строку, поэтому преобразуем JSON обратно в строку
    const rows = parseWebSocketMessage(JSON.stringify(data));

    logger.info(
      `[HTTP Fallback] Successfully parsed ${rows.length} rows from HTTP response`
    );
    return rows;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      logger.debug('[HTTP Fallback] Request aborted');
    } else {
      logger.error('[HTTP Fallback] HTTP request failed:', err);
    }
    return [];
  }
}
