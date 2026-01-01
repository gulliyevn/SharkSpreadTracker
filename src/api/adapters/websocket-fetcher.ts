/**
 * WebSocket fetcher для получения данных через WebSocket
 *
 * ВАЖНО: Бэкенд ожидает keep-alive соединение (одно постоянное открытое соединение),
 * а не request-response паттерн (новое соединение для каждого запроса).
 *
 * Использует WebSocketConnectionManager для управления постоянным соединением.
 */

import { logger } from '@/utils/logger';
import { WEBSOCKET_URL } from '@/constants/api';
import { fetchStraightSpreadsHttpFallback } from './http-fallback';
import {
  createWebSocketUrl,
  type WebSocketParams,
} from './utils/websocket-client';
import type { StraightData } from '@/types';
import { wsConnectionManager } from './websocket-connection-manager';

const DATA_RECEIVE_TIMEOUT = 90000; // 90 секунд - таймаут для получения данных (бэкенду нужно около минуты для загрузки)

export async function fetchStraightSpreadsInternal(
  params: WebSocketParams
): Promise<StraightData[]> {
  if (!WEBSOCKET_URL) {
    logger.error(
      '[WebSocket] WEBSOCKET_URL not configured. Please set VITE_WEBSOCKET_URL or VITE_BACKEND_URL'
    );
    return [];
  }

  // На production/HTTPS используем HTTP fallback через прокси
  // Браузер блокирует ws:// соединения с HTTPS страниц (Mixed Content Policy)
  // Бэкенд не поддерживает HTTP fallback (возвращает 426), но пробуем как последнюю попытку
  const isProduction = import.meta.env.PROD;
  const isHttps =
    typeof window !== 'undefined' && window.location.protocol === 'https:';
  const useHttpFallback =
    import.meta.env.VITE_USE_HTTP_FALLBACK === 'true' ||
    (isProduction && isHttps);

  if (useHttpFallback) {
    logger.info('[WebSocket] Using HTTP fallback for production/HTTPS');
    let httpUrl: URL;

    if (WEBSOCKET_URL.startsWith('/')) {
      httpUrl = new URL(WEBSOCKET_URL, window.location.origin);
    } else if (
      WEBSOCKET_URL.startsWith('ws://') ||
      WEBSOCKET_URL.startsWith('wss://')
    ) {
      const wsUrlObj = new URL(WEBSOCKET_URL);
      httpUrl = new URL(
        `/api/backend${wsUrlObj.pathname}${wsUrlObj.search}`,
        window.location.origin
      );
    } else {
      httpUrl = new URL(WEBSOCKET_URL);
    }

    if (params.token) {
      httpUrl.searchParams.set('token', params.token);
    }
    if (params.network) {
      httpUrl.searchParams.set('network', params.network);
    }

    try {
      return await fetchStraightSpreadsHttpFallback(httpUrl, params);
    } catch (err) {
      logger.error('[WebSocket] HTTP fallback failed:', err);
      return [];
    }
  }

  // Проверяем доступность WebSocket API
  if (typeof window === 'undefined' || typeof WebSocket === 'undefined') {
    logger.warn('[WebSocket] WebSocket not available, using HTTP fallback');
    const url = createWebSocketUrl(WEBSOCKET_URL, params);
    return await fetchStraightSpreadsHttpFallback(url, params);
  }

  // Используем Connection Manager для keep-alive соединения
  logger.info('[WebSocket] Using WebSocket Connection Manager (keep-alive)');

  return new Promise<StraightData[]>((resolve) => {
    let settled = false;
    const rows: StraightData[] = [];
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let unsubscribeData: (() => void) | null = null;
    let unsubscribeError: (() => void) | null = null;

    const unsubscribe = () => {
      if (unsubscribeData) unsubscribeData();
      if (unsubscribeError) unsubscribeError();
      unsubscribeData = null;
      unsubscribeError = null;
    };

    const finish = (result: StraightData[]) => {
      if (settled) return;
      settled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      unsubscribe();
      resolve(result);
    };

    // Таймаут для получения данных
    timeoutId = setTimeout(() => {
      if (!settled) {
        logger.warn('[WebSocket] Data receive timeout reached');
        finish(rows.length > 0 ? rows : []);
      }
    }, DATA_RECEIVE_TIMEOUT);

    // Обработчик отмены запроса
    if (params.signal) {
      if (params.signal.aborted) {
        finish([]);
        return;
      }
      params.signal.addEventListener('abort', () => finish([]), { once: true });
    }

    // Подписываемся на сообщения через Connection Manager
    unsubscribeData = wsConnectionManager.subscribe((data: StraightData[]) => {
      if (data.length > 0) {
        rows.push(...data);
        logger.info(
          `[WebSocket] Received ${data.length} rows via Connection Manager, total: ${rows.length}`
        );

        // Если получили данные, завершаем через небольшую задержку
        // (чтобы собрать все сообщения от бэкенда)
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            if (!settled && rows.length > 0) {
              finish(rows);
            }
          }, 1000); // Даем 1 секунду на получение всех сообщений
        }
      }
    });

    // Подписываемся на ошибки
    unsubscribeError = wsConnectionManager.onError((error: Error) => {
      logger.error('[WebSocket] Connection Manager error:', error);
      if (!settled) {
        finish([]);
      }
    });

    // Устанавливаем соединение (если еще не установлено)
    wsConnectionManager.connect(params);
  });
}
