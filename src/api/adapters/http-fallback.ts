/**
 * HTTP fallback для случая, когда WebSocket не обновился
 *
 * Согласно документации API (API_DOCUMENTATION.md):
 * - Если WebSocket handshake не удался, сервер возвращает HTTP 200 с JSON payload
 * - Формат ответа: массив объектов StraightData
 * - Endpoint: /socket/sharkStraight
 *
 * ВАЖНО: Если бэкенд возвращает HTML вместо JSON, это означает проблему с конфигурацией:
 * - Неправильный endpoint
 * - Бэкенд не настроен правильно
 * - Бэкенд возвращает дефолтную HTML страницу (404 или error page)
 */

import { logger } from '@/utils/logger';
import { BACKEND_URL } from '@/constants/api';
import type { WebSocketParams } from './utils/websocket-client';
import type { StraightData } from '@/types';

const HTTP_FALLBACK_TIMEOUT = 150000; // 150 секунд (2.5 минуты) - таймаут для HTTP fallback запроса (бэкенду нужно около 2 минут для загрузки данных)

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
  logger.debug('[HTTP Fallback] Request URL:', httpUrl.toString());
  logger.debug('[HTTP Fallback] Is Production:', isProduction);
  logger.debug('[HTTP Fallback] Is HTTPS:', isHttps);
  logger.debug('[HTTP Fallback] BACKEND_URL:', BACKEND_URL);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      HTTP_FALLBACK_TIMEOUT
    );

    if (params.signal) {
      // Проверяем, не отменен ли уже сигнал
      if (params.signal.aborted) {
        logger.warn('[HTTP Fallback] Signal already aborted before request');
        logger.debug('[HTTP Fallback] Request signal was already aborted');
        return [];
      }
      params.signal.addEventListener(
        'abort',
        () => {
          logger.debug(
            '[HTTP Fallback] External signal aborted, aborting request'
          );
          controller.abort();
        },
        {
          once: true,
        }
      );
    }

    logger.debug('[HTTP Fallback] Sending fetch request...');
    logger.debug('[HTTP Fallback] Timeout:', HTTP_FALLBACK_TIMEOUT, 'ms');
    const startTime = Date.now();
    const response = await fetch(httpUrl.toString(), {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });
    const requestTime = Date.now() - startTime;
    logger.debug('[HTTP Fallback] Request completed in', requestTime, 'ms');

    clearTimeout(timeoutId);
    logger.debug('[HTTP Fallback] Response status:', response.status);
    logger.debug('[HTTP Fallback] Response ok:', response.ok);
    logger.debug(
      '[HTTP Fallback] Response headers:',
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

    // Проверяем content-type перед парсингом
    const contentType = response.headers.get('content-type') || '';
    const responseText = await response.text();

    // Если сервер вернул HTML вместо JSON
    if (
      contentType.includes('text/html') ||
      responseText.trim().startsWith('<!')
    ) {
      logger.error('[HTTP Fallback] Backend returned HTML instead of JSON');
      logger.error(
        '[HTTP Fallback] Response preview:',
        responseText.substring(0, 500)
      );
      logger.error(
        '[HTTP Fallback] Backend returned HTML instead of JSON. Check backend URL and endpoint.'
      );
      return [];
    }

    // Пытаемся распарсить как JSON
    let data: unknown;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      logger.error(
        '[HTTP Fallback] Failed to parse response as JSON:',
        parseError
      );
      logger.error(
        '[HTTP Fallback] Response preview:',
        responseText.substring(0, 500)
      );
      logger.error(
        '[HTTP Fallback] Failed to parse response as JSON. Response might be HTML or invalid JSON.'
      );
      return [];
    }
    logger.debug('[HTTP Fallback] Received data:', {
      type: Array.isArray(data) ? 'array' : typeof data,
      length: Array.isArray(data) ? data.length : 'N/A',
      preview: Array.isArray(data) && data.length > 0 ? data[0] : data,
    });
    logger.info('[HTTP Fallback] Received data via HTTP:', {
      type: Array.isArray(data) ? 'array' : typeof data,
      length: Array.isArray(data) ? data.length : 1,
    });

    // Для HTTP ответов используем данные напрямую, без двойного парсинга
    // parseWebSocketMessage используется только для WebSocket сообщений (строки)
    // HTTP ответ уже парсится как JSON, поэтому используем его напрямую
    let rows: StraightData[];
    if (Array.isArray(data)) {
      // Если это массив, используем его напрямую
      rows = data.filter(
        (item): item is StraightData =>
          item &&
          typeof item === 'object' &&
          item !== null &&
          'token' in item &&
          'aExchange' in item &&
          'bExchange' in item &&
          'priceA' in item &&
          'priceB' in item &&
          'spread' in item &&
          'network' in item &&
          'limit' in item
      );
    } else if (
      data &&
      typeof data === 'object' &&
      data !== null &&
      !Array.isArray(data)
    ) {
      // Если это один объект, проверяем наличие нужных свойств
      const obj = data as Record<string, unknown>;
      if ('token' in obj && 'aExchange' in obj && 'bExchange' in obj) {
        rows = [
          {
            token: String(obj.token || ''),
            aExchange: String(obj.aExchange || ''),
            bExchange: String(obj.bExchange || ''),
            priceA: String(obj.priceA || ''),
            priceB: String(obj.priceB || ''),
            spread: String(obj.spread || ''),
            network: String(obj.network || ''),
            limit: String(obj.limit || ''),
          } as StraightData,
        ];
      } else {
        rows = [];
      }
    } else {
      rows = [];
    }
    logger.debug('[HTTP Fallback] Parsed rows:', rows.length);

    logger.info(
      `[HTTP Fallback] Successfully parsed ${rows.length} rows from HTTP response`
    );
    return rows;
  } catch (err) {
    logger.error('[HTTP Fallback] Error:', err);
    if (err instanceof Error && err.name === 'AbortError') {
      // Проверяем, был ли это таймаут или внешняя отмена
      const wasTimeout = !params.signal?.aborted;
      if (wasTimeout) {
        logger.warn(
          '[HTTP Fallback] Request timed out after',
          HTTP_FALLBACK_TIMEOUT,
          'ms'
        );
        logger.warn(
          '[HTTP Fallback] Request timed out after',
          HTTP_FALLBACK_TIMEOUT,
          'ms'
        );
        logger.warn('[HTTP Fallback] Backend might be slow or unreachable');
        logger.warn(
          '[HTTP Fallback] Check if backend is running at:',
          BACKEND_URL
        );
      } else {
        logger.debug('[HTTP Fallback] Request aborted by external signal');
        logger.debug('[HTTP Fallback] Request was aborted by external signal');
      }
    } else {
      logger.error('[HTTP Fallback] HTTP request failed:', err);
      logger.error(
        '[HTTP Fallback] Request failed:',
        err instanceof Error ? err.message : String(err)
      );
      if (err instanceof Error && err.message.includes('fetch')) {
        logger.error(
          '[HTTP Fallback] Network error - check if backend is accessible'
        );
        logger.error('[HTTP Fallback] Backend URL:', BACKEND_URL);
      }
    }
    return [];
  }
}
