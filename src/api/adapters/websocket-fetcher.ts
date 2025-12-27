/**
 * WebSocket fetcher для получения данных через WebSocket
 *
 * ВАЖНО: WebSocket создается каждый раз заново - это ПРАВИЛЬНО!
 * Согласно документации API, бэкенд использует request-response паттерн:
 * - Клиент устанавливает WebSocket соединение
 * - Сервер сразу отправляет данные и закрывает соединение
 * - Для получения новых данных нужно переподключаться
 *
 * Автоматическое переподключение реализовано через React Query:
 * - useSpreadData использует refetchInterval для периодического обновления
 * - При каждом обновлении создается новое WebSocket соединение
 * - Это соответствует архитектуре бэкенда и не является багом
 */

import { logger } from '@/utils/logger';
import { WEBSOCKET_URL } from '@/constants/api';
import { setConnectionStatus } from './connection-status';
import { fetchStraightSpreadsHttpFallback } from './http-fallback';
import {
  createWebSocketUrl,
  parseWebSocketMessage,
  type WebSocketParams,
} from './utils/websocket-client';
import type { StraightData } from '@/types';

const WS_TIMEOUT = 10000; // 10 секунд - таймаут для WebSocket
const HTTP_FALLBACK_TIMEOUT = 10000; // 10 секунд - таймаут для HTTP fallback запроса
const DATA_RECEIVED_DELAY = 500; // 500мс задержка для обработки всех сообщений

export async function fetchStraightSpreadsInternal(
  params: WebSocketParams
): Promise<StraightData[]> {
  if (!WEBSOCKET_URL) {
    logger.error(
      '[WebSocket] WEBSOCKET_URL not configured. Please set VITE_WEBSOCKET_URL or VITE_BACKEND_URL'
    );
    setConnectionStatus('error');
    return [];
  }

  if (typeof window === 'undefined' || typeof WebSocket === 'undefined') {
    logger.warn('[WebSocket] WebSocket not available, using HTTP fallback');
    const url = createWebSocketUrl(WEBSOCKET_URL, params);
    return await fetchStraightSpreadsHttpFallback(url, params);
  }

  // На production или HTTPS страницах всегда используем HTTP fallback
  // Браузер блокирует ws:// соединения с HTTPS страниц (Mixed Content Policy)
  const isDev = import.meta.env.DEV;
  const isProduction = import.meta.env.PROD;
  const isHttps =
    typeof window !== 'undefined' && window.location.protocol === 'https:';
  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1');
  const useHttpDirectly =
    import.meta.env.VITE_USE_HTTP_FALLBACK === 'true' ||
    (isDev && isLocalhost) ||
    isProduction ||
    isHttps;

  if (useHttpDirectly) {
    logger.info(
      isDev && isLocalhost
        ? '[WebSocket] Using HTTP fallback on localhost (dev mode)'
        : isProduction || isHttps
          ? '[WebSocket] Using HTTP fallback on production/HTTPS (Mixed Content Policy)'
          : '[WebSocket] Using HTTP fallback directly (VITE_USE_HTTP_FALLBACK=true)'
    );
    // На production/HTTPS WEBSOCKET_URL уже относительный (/api/backend/...)
    // Создаем URL напрямую, без createWebSocketUrl (который для WebSocket)
    const httpUrl = new URL(WEBSOCKET_URL, window.location.origin);
    // Добавляем query параметры
    if (params.token) {
      httpUrl.searchParams.set('token', params.token);
    }
    if (params.network) {
      httpUrl.searchParams.set('network', params.network);
    }
    // Создаем фиктивный URL объект для совместимости с fetchStraightSpreadsHttpFallback
    const url = new URL(httpUrl.toString());
    setConnectionStatus('connecting');
    const result = await fetchStraightSpreadsHttpFallback(url, params);
    if (result.length > 0) {
      setConnectionStatus('connected');
    } else {
      setConnectionStatus('disconnected');
    }
    return result;
  }

  logger.info(`[WebSocket] Connecting to: ${WEBSOCKET_URL}`);
  logger.info(
    `[WebSocket] Protocol: ${typeof window !== 'undefined' ? window.location.protocol : 'unknown'}`
  );
  logger.info(
    `[WebSocket] Is HTTPS: ${typeof window !== 'undefined' ? window.location.protocol === 'https:' : 'unknown'}`
  );
  setConnectionStatus('connecting');

  const url = createWebSocketUrl(WEBSOCKET_URL, params);
  const wsUrlString = url.toString();
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/98107816-f1a6-4cf2-9ef8-59354928d2ee', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: 'websocket-fetcher.ts:85',
      message: 'Before WebSocket creation',
      data: {
        websocketUrl: WEBSOCKET_URL,
        finalUrl: wsUrlString,
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port,
        pathname: url.pathname,
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'C',
    }),
  }).catch(() => {});
  // #endregion
  logger.info(`[WebSocket] Final URL: ${wsUrlString}`);
  logger.info(`[WebSocket] URL protocol: ${url.protocol}`);

  // Создаем новое WebSocket соединение для каждого запроса
  // Это правильно для request-response паттерна бэкенда
  return new Promise<StraightData[]>((resolve) => {
    let settled = false;
    const rows: StraightData[] = [];
    let messageCount = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let httpFallbackTimeout: ReturnType<typeof setTimeout> | null = null;

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/98107816-f1a6-4cf2-9ef8-59354928d2ee', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'websocket-fetcher.ts:98',
        message: 'Creating WebSocket instance',
        data: { wsUrl: wsUrlString },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'C',
      }),
    }).catch(() => {});
    // #endregion
    const ws = new WebSocket(wsUrlString);

    // Настраиваем WebSocket для больших сообщений
    ws.binaryType = 'blob';

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (httpFallbackTimeout) {
        clearTimeout(httpFallbackTimeout);
        httpFallbackTimeout = null;
      }
      try {
        if (
          ws.readyState === WebSocket.OPEN ||
          ws.readyState === WebSocket.CONNECTING
        ) {
          ws.close();
        }
      } catch {
        // Игнорируем ошибки закрытия
      }
    };

    const finish = (result: StraightData[]) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (result.length > 0) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('disconnected');
      }
      resolve(result);
    };

    // Таймаут для автоматического переключения на HTTP fallback
    httpFallbackTimeout = setTimeout(async () => {
      // #region agent log
      fetch(
        'http://127.0.0.1:7243/ingest/98107816-f1a6-4cf2-9ef8-59354928d2ee',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'websocket-fetcher.ts:137',
            message: 'HTTP fallback timeout triggered',
            data: { settled, rowsCount: rows.length, messageCount },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'D',
          }),
        }
      ).catch(() => {});
      // #endregion
      if (settled || rows.length > 0) {
        logger.debug(
          '[WebSocket] HTTP fallback timeout skipped - already settled or has data'
        );
        return;
      }
      logger.warn(
        '[WebSocket] ⏱️ No data received, switching to HTTP fallback...'
      );
      cleanup();
      try {
        const httpResult = await fetchStraightSpreadsHttpFallback(url, params);
        // #region agent log
        fetch(
          'http://127.0.0.1:7243/ingest/98107816-f1a6-4cf2-9ef8-59354928d2ee',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              location: 'websocket-fetcher.ts:149',
              message: 'HTTP fallback result',
              data: { httpResultCount: httpResult.length },
              timestamp: Date.now(),
              sessionId: 'debug-session',
              runId: 'run1',
              hypothesisId: 'F',
            }),
          }
        ).catch(() => {});
        // #endregion
        finish(httpResult);
      } catch (err) {
        // #region agent log
        fetch(
          'http://127.0.0.1:7243/ingest/98107816-f1a6-4cf2-9ef8-59354928d2ee',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              location: 'websocket-fetcher.ts:152',
              message: 'HTTP fallback error',
              data: {
                errorMessage: err instanceof Error ? err.message : String(err),
              },
              timestamp: Date.now(),
              sessionId: 'debug-session',
              runId: 'run1',
              hypothesisId: 'F',
            }),
          }
        ).catch(() => {});
        // #endregion
        logger.error('[WebSocket] HTTP fallback failed:', err);
        finish([]);
      }
    }, WS_TIMEOUT);

    // Общий таймаут
    timeoutId = setTimeout(() => {
      if (!settled) {
        logger.warn('[WebSocket] Overall timeout reached');
        finish(rows);
      }
    }, WS_TIMEOUT + HTTP_FALLBACK_TIMEOUT);

    if (params.signal) {
      if (params.signal.aborted) {
        finish([]);
        return;
      }
      params.signal.addEventListener('abort', () => finish([]), { once: true });
    }

    const handleMessage = (newRows: StraightData[]) => {
      for (const row of newRows) {
        rows.push(row);
      }
      messageCount++;

      logger.info(
        `[WebSocket] Received ${newRows.length} rows, total: ${rows.length}`
      );

      // Если получили данные, отменяем HTTP fallback и завершаем через небольшую задержку
      if (rows.length > 0 && httpFallbackTimeout) {
        clearTimeout(httpFallbackTimeout);
        httpFallbackTimeout = null;
        setTimeout(() => {
          if (!settled) {
            finish(rows);
          }
        }, DATA_RECEIVED_DELAY);
      }
    };

    ws.onopen = () => {
      // #region agent log
      fetch(
        'http://127.0.0.1:7243/ingest/98107816-f1a6-4cf2-9ef8-59354928d2ee',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'websocket-fetcher.ts:195',
            message: 'WebSocket onopen',
            data: { readyState: ws.readyState, url: wsUrlString },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'C',
          }),
        }
      ).catch(() => {});
      // #endregion
      logger.info('[WebSocket] ✅ Connected successfully!');
      setConnectionStatus('connected');
    };

    ws.onmessage = async (event) => {
      messageCount++;
      // #region agent log
      fetch(
        'http://127.0.0.1:7243/ingest/98107816-f1a6-4cf2-9ef8-59354928d2ee',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'websocket-fetcher.ts:200',
            message: 'WebSocket onmessage start',
            data: {
              messageNumber: messageCount,
              dataType: typeof event.data,
              isString: typeof event.data === 'string',
              isBlob: event.data instanceof Blob,
              isArrayBuffer: event.data instanceof ArrayBuffer,
            },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'E',
          }),
        }
      ).catch(() => {});
      // #endregion
      logger.info(`[WebSocket] 📩 Message received (message #${messageCount})`);

      let textData: string;

      // Обрабатываем и строки, и Blob
      if (typeof event.data === 'string') {
        textData = event.data;
      } else if (event.data instanceof Blob) {
        try {
          textData = await event.data.text();
        } catch (err) {
          logger.error('[WebSocket] Failed to convert Blob to text:', err);
          return;
        }
      } else if (event.data instanceof ArrayBuffer) {
        try {
          textData = new TextDecoder().decode(event.data);
        } catch (err) {
          logger.error(
            '[WebSocket] Failed to convert ArrayBuffer to text:',
            err
          );
          return;
        }
      } else {
        logger.warn('[WebSocket] ⚠️ Unknown message type:', typeof event.data);
        return;
      }

      // Парсим данные
      try {
        // #region agent log
        fetch(
          'http://127.0.0.1:7243/ingest/98107816-f1a6-4cf2-9ef8-59354928d2ee',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              location: 'websocket-fetcher.ts:232',
              message: 'Before parseWebSocketMessage',
              data: {
                textDataLength: textData.length,
                textDataPreview: textData.slice(0, 200),
              },
              timestamp: Date.now(),
              sessionId: 'debug-session',
              runId: 'run1',
              hypothesisId: 'E',
            }),
          }
        ).catch(() => {});
        // #endregion
        const parsedRows = parseWebSocketMessage(textData);
        // #region agent log
        fetch(
          'http://127.0.0.1:7243/ingest/98107816-f1a6-4cf2-9ef8-59354928d2ee',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              location: 'websocket-fetcher.ts:235',
              message: 'After parseWebSocketMessage',
              data: { parsedRowsCount: parsedRows.length },
              timestamp: Date.now(),
              sessionId: 'debug-session',
              runId: 'run1',
              hypothesisId: 'E',
            }),
          }
        ).catch(() => {});
        // #endregion
        logger.info(
          `[WebSocket] ✅ Parsed ${parsedRows.length} rows from message`
        );
        handleMessage(parsedRows);
      } catch (err) {
        // #region agent log
        fetch(
          'http://127.0.0.1:7243/ingest/98107816-f1a6-4cf2-9ef8-59354928d2ee',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              location: 'websocket-fetcher.ts:239',
              message: 'parseWebSocketMessage error',
              data: {
                errorMessage: err instanceof Error ? err.message : String(err),
              },
              timestamp: Date.now(),
              sessionId: 'debug-session',
              runId: 'run1',
              hypothesisId: 'E',
            }),
          }
        ).catch(() => {});
        // #endregion
        logger.error('[WebSocket] ❌ Failed to parse message:', err);
        if (!settled) {
          logger.warn(
            '[WebSocket] Finishing with empty array due to parse error'
          );
          finish([]);
        }
      }
    };

    ws.onerror = (error) => {
      // #region agent log
      fetch(
        'http://127.0.0.1:7243/ingest/98107816-f1a6-4cf2-9ef8-59354928d2ee',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'websocket-fetcher.ts:249',
            message: 'WebSocket onerror',
            data: {
              readyState: ws.readyState,
              url: wsUrlString,
              errorType: error.type,
              isLocalhost:
                typeof window !== 'undefined' &&
                (window.location.hostname === 'localhost' ||
                  window.location.hostname === '127.0.0.1'),
            },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'C',
          }),
        }
      ).catch(() => {});
      // #endregion
      logger.error('[WebSocket] ❌ Error event triggered');
      logger.error('[WebSocket] Error details:', error);
      // На localhost это может быть нормально из-за CORS/сетевых ограничений
      // На production должно работать, если сервер доступен из интернета
      if (
        typeof window !== 'undefined' &&
        window.location.hostname === 'localhost'
      ) {
        logger.debug(
          '[WebSocket] Note: WebSocket errors on localhost are common due to CORS/network restrictions. This should work on production.'
        );
      }
      setConnectionStatus('error');
    };

    ws.onclose = (event) => {
      // #region agent log
      fetch(
        'http://127.0.0.1:7243/ingest/98107816-f1a6-4cf2-9ef8-59354928d2ee',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'websocket-fetcher.ts:265',
            message: 'WebSocket onclose',
            data: {
              code: event.code,
              reason: event.reason,
              wasClean: event.wasClean,
              messageCount,
              rowsCount: rows.length,
              settled,
            },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'D',
          }),
        }
      ).catch(() => {});
      // #endregion
      logger.info(
        `[WebSocket] 🔌 Closed: code=${event.code}, received ${messageCount} messages, ${rows.length} rows`
      );

      // Если соединение закрылось без данных и мы еще не settled
      if (!settled) {
        if (rows.length > 0) {
          finish(rows);
        } else {
          logger.warn(
            '[WebSocket] ⚠️ Connection closed without receiving any messages!'
          );
          setConnectionStatus('disconnected');
        }
      }
    };
  });
}
