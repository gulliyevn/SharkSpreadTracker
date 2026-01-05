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

const DATA_RECEIVE_TIMEOUT = 60000; // 60 секунд - таймаут для получения данных (достаточно для keep-alive)
const WEBSOCKET_CONNECTION_TIMEOUT = 15000; // 15 секунд - таймаут для установления WebSocket соединения (keep-alive может подключаться дольше)
const KEEP_ALIVE_DATA_WAIT = 10000; // 10 секунд - время ожидания после получения первых данных в keep-alive соединении (бэкенд может отправлять данные частями)

/**
 * Создает HTTP URL из WebSocket URL для fallback
 */
function createHttpUrlFromWebSocket(
  wsUrl: string,
  params: WebSocketParams
): URL {
  let httpUrl: URL;

  if (wsUrl.startsWith('/')) {
    httpUrl = new URL(wsUrl, window.location.origin);
  } else if (wsUrl.startsWith('ws://') || wsUrl.startsWith('wss://')) {
    const wsUrlObj = new URL(wsUrl);
    httpUrl = new URL(
      `/api/backend${wsUrlObj.pathname}${wsUrlObj.search}`,
      window.location.origin
    );
  } else {
    httpUrl = new URL(wsUrl);
  }

  if (params.token) {
    httpUrl.searchParams.set('token', params.token);
  }
  if (params.network) {
    httpUrl.searchParams.set('network', params.network);
  }

  return httpUrl;
}

export async function fetchStraightSpreadsInternal(
  params: WebSocketParams
): Promise<StraightData[]> {
  if (!WEBSOCKET_URL) {
    logger.error(
      '[WebSocket] WEBSOCKET_URL not configured. Please set VITE_WEBSOCKET_URL or VITE_BACKEND_URL'
    );
    return [];
  }

  // Бэкенд НЕ поддерживает HTTP fallback для /socket/sharkStraight (возвращает 426)
  // ВАЖНО: На HTTPS страницах (production) требуется wss:// (WebSocket Secure)
  // Бэкенд должен поддерживать wss:// для работы на production
  // HTTP fallback доступен только если явно включен через VITE_USE_HTTP_FALLBACK
  // ИЛИ если WebSocket URL начинается с ws:// (небезопасный) на HTTPS странице
  // ВАЖНО: На localhost используем прямой WebSocket (wss://sosal.space), НЕ HTTP fallback
  const isHttps =
    typeof window !== 'undefined' && window.location.protocol === 'https:';
  const isInsecureWs = WEBSOCKET_URL.startsWith('ws://');

  // Используем HTTP fallback только если:
  // 1. Явно включен через VITE_USE_HTTP_FALLBACK
  // 2. ИЛИ если на HTTPS странице пытаемся использовать небезопасный ws:// (Mixed Content)
  // НЕ используем HTTP fallback на localhost - бэкенд не поддерживает HTTP для /socket/sharkStraight (возвращает 426)
  const useHttpFallbackImmediately =
    import.meta.env.VITE_USE_HTTP_FALLBACK === 'true' ||
    (isHttps && isInsecureWs);

  if (useHttpFallbackImmediately) {
    const reason =
      import.meta.env.VITE_USE_HTTP_FALLBACK === 'true'
        ? 'explicitly enabled'
        : 'insecure ws:// on HTTPS';
    logger.info(`[WebSocket] Using HTTP fallback: ${reason}`);
    const httpUrl = createHttpUrlFromWebSocket(WEBSOCKET_URL, params);

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
    let connectionTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let unsubscribeData: (() => void) | null = null;
    let unsubscribeError: (() => void) | null = null;
    let unsubscribeClose: (() => void) | null = null;
    let connectionEstablished = false;

    const unsubscribe = () => {
      if (unsubscribeData) unsubscribeData();
      if (unsubscribeError) unsubscribeError();
      if (unsubscribeClose) unsubscribeClose();
      unsubscribeData = null;
      unsubscribeError = null;
      unsubscribeClose = null;
    };

    // Переменная для интервала проверки соединения (объявляем заранее)
    let checkConnectionInterval: ReturnType<typeof setInterval> | null = null;

    const finishWithCleanup = (result: StraightData[]) => {
      if (settled) return;
      settled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (connectionTimeoutId) {
        clearTimeout(connectionTimeoutId);
        connectionTimeoutId = null;
      }
      if (checkConnectionInterval) {
        clearInterval(checkConnectionInterval);
        checkConnectionInterval = null;
      }
      unsubscribe();
      resolve(result);
    };

    // Обертка для finish, которая очищает интервал проверки соединения
    const finishWithIntervalCleanup = (result: StraightData[]) => {
      if (checkConnectionInterval) {
        clearInterval(checkConnectionInterval);
        checkConnectionInterval = null;
      }
      finishWithCleanup(result);
    };

    // Таймаут для получения данных
    timeoutId = setTimeout(() => {
      if (!settled) {
        logger.warn('[WebSocket] Data receive timeout reached');
        finishWithIntervalCleanup(rows.length > 0 ? rows : []);
      }
    }, DATA_RECEIVE_TIMEOUT);

    // Таймаут для установления соединения - если WebSocket не подключился за 5 секунд,
    // переключаемся на HTTP fallback
    // ВАЖНО: HTTP fallback для /socket/sharkStraight не работает (возвращает 426),
    // поэтому мы просто возвращаем пустой массив и логируем ошибку
    connectionTimeoutId = setTimeout(async () => {
      if (!settled && !connectionEstablished) {
        logger.warn(
          '[WebSocket] Connection timeout - WebSocket failed to connect within timeout'
        );
        logger.warn(
          '[WebSocket] Note: HTTP fallback for /socket/sharkStraight is not supported (returns 426)'
        );
        unsubscribe();
        // Не используем HTTP fallback, так как endpoint /socket/sharkStraight не поддерживает HTTP
        // Просто возвращаем пустой массив
        finishWithIntervalCleanup([]);
      }
    }, WEBSOCKET_CONNECTION_TIMEOUT);

    // Обработчик отмены запроса
    if (params.signal) {
      if (params.signal.aborted) {
        finishWithIntervalCleanup([]);
        return;
      }
      params.signal.addEventListener(
        'abort',
        () => finishWithIntervalCleanup([]),
        { once: true }
      );
    }

    // ВАЖНО: Сначала подписываемся, ПОТОМ устанавливаем соединение
    // Это гарантирует, что мы не пропустим данные, которые придут сразу после подключения
    logger.debug(
      `[WebSocket] Subscribing to Connection Manager before connecting...`
    );

    // Подписываемся на сообщения через Connection Manager
    unsubscribeData = wsConnectionManager.subscribe((data: StraightData[]) => {
      // Отмечаем, что соединение установлено и данные получены
      if (!connectionEstablished) {
        connectionEstablished = true;
        if (connectionTimeoutId) {
          clearTimeout(connectionTimeoutId);
          connectionTimeoutId = null;
        }
      }

      logger.debug(
        `[WebSocket] Callback received ${data.length} rows, current rows: ${rows.length}, settled: ${settled}`
      );
      if (data.length > 0) {
        // Для больших массивов (>100k элементов) используем цикл вместо spread,
        // чтобы избежать "Maximum call stack size exceeded"
        if (data.length > 100000) {
          for (const item of data) {
            rows.push(item);
          }
        } else {
          rows.push(...data);
        }
        logger.info(
          `[WebSocket] Received ${data.length} rows via Connection Manager, total: ${rows.length}`
        );

        // ВАЖНО: Для keep-alive соединения бэкенд может отправлять данные частями
        // Не завершаем сразу, а ждем еще немного, чтобы собрать все данные
        // Каждый раз когда получаем новые данные, сбрасываем таймер ожидания
        if (timeoutId) {
          clearTimeout(timeoutId);
          // Устанавливаем новый таймер - ждем еще KEEP_ALIVE_DATA_WAIT после последнего сообщения
          timeoutId = setTimeout(() => {
            if (!settled && rows.length > 0) {
              logger.info(
                `[WebSocket] ✅ Finishing with ${rows.length} rows after keep-alive delay (no new data for ${KEEP_ALIVE_DATA_WAIT}ms)`
              );
              finishWithIntervalCleanup(rows);
            }
          }, KEEP_ALIVE_DATA_WAIT);
          logger.debug(
            `[WebSocket] Reset keep-alive wait timer (${KEEP_ALIVE_DATA_WAIT}ms) after receiving ${data.length} rows`
          );
        } else {
          // Если timeoutId еще не установлен (редкий случай), устанавливаем его
          logger.warn('[WebSocket] timeoutId was null, setting it now');
          timeoutId = setTimeout(() => {
            if (!settled && rows.length > 0) {
              logger.info(
                `[WebSocket] ✅ Finishing with ${rows.length} rows after keep-alive delay`
              );
              finishWithIntervalCleanup(rows);
            }
          }, KEEP_ALIVE_DATA_WAIT);
        }
      }
    });

    // Подписываемся на ошибки
    unsubscribeError = wsConnectionManager.onError(async (error: Error) => {
      logger.error('[WebSocket] Connection Manager error:', error);

      // Если соединение не установлено, просто возвращаем пустой массив
      // HTTP fallback для /socket/sharkStraight не работает (возвращает 426)
      if (!connectionEstablished) {
        logger.warn(
          '[WebSocket] WebSocket connection failed before establishing connection'
        );
        logger.warn(
          '[WebSocket] Note: HTTP fallback for /socket/sharkStraight is not supported (returns 426)'
        );
        unsubscribe();

        // Отменяем таймаут подключения
        if (connectionTimeoutId) {
          clearTimeout(connectionTimeoutId);
          connectionTimeoutId = null;
        }

        // Не используем HTTP fallback, так как endpoint не поддерживает HTTP
        finishWithIntervalCleanup([]);
        return;
      }

      // Если соединение было установлено, но произошла ошибка после получения данных
      if (!settled) {
        finishWithIntervalCleanup([]);
      }
    });

    // Подписываемся на закрытие соединения
    unsubscribeClose = wsConnectionManager.onClose((event) => {
      logger.debug(
        `[WebSocket] onClose callback: code=${event.code}, hadData=${event.hadData}, settled=${settled}, currentRows=${rows.length}`
      );

      // Если соединение закрылось без данных и это не нормальное закрытие
      if (!event.hadData && event.code !== 1000 && !settled) {
        logger.warn(
          `[WebSocket] Connection closed (code=${event.code}, wasClean=${event.wasClean}) without receiving data`
        );

        // ВАЖНО: НЕ отписываемся сразу! Ждем данные, которые могут прийти с задержкой
        // Для keep-alive соединений бэкенд может отправлять данные частями
        // и последние данные могут прийти прямо перед закрытием соединения
        const closeDelay = 5000; // 5 секунд задержки для keep-alive соединений
        logger.info(
          `[WebSocket] Waiting ${closeDelay}ms after connection close (code=${event.code}) to check for delayed data...`
        );
        logger.info(
          `[WebSocket] Current state: rows=${rows.length}, settled=${settled}, subscribers=${wsConnectionManager.isConnected() ? 'connected' : 'disconnected'}`
        );

        // НЕ вызываем unsubscribe() здесь - оставляем подписчика активным
        // чтобы получить данные, которые могут прийти с задержкой
        setTimeout(() => {
          if (!settled) {
            // Проверяем, получили ли мы данные за это время
            if (rows.length > 0) {
              logger.info(
                `[WebSocket] ✅ Received ${rows.length} rows after connection close, finishing with data`
              );
              finishWithIntervalCleanup(rows);
            } else {
              logger.warn(
                `[WebSocket] No data received after ${closeDelay}ms, finishing with empty array (code=${event.code})`
              );
              // Только сейчас отписываемся и завершаем Promise
              finishWithIntervalCleanup([]);
            }
          }
        }, closeDelay);
      } else if (event.hadData && !settled) {
        // Если данные были получены, но Promise еще не завершен
        // Это может произойти, если данные пришли прямо перед закрытием
        logger.info(
          `[WebSocket] Connection closed with data (code=${event.code}), checking if we need to finish...`
        );
        // Даем небольшую задержку, чтобы убедиться, что все данные обработаны
        setTimeout(() => {
          if (!settled && rows.length > 0) {
            logger.info(
              `[WebSocket] ✅ Finishing with ${rows.length} rows after connection close with data`
            );
            finishWithIntervalCleanup(rows);
          }
        }, 500);
      }
    });

    // Отслеживаем успешное подключение через периодическую проверку
    checkConnectionInterval = setInterval(() => {
      if (wsConnectionManager.isConnected()) {
        connectionEstablished = true;
        if (connectionTimeoutId) {
          clearTimeout(connectionTimeoutId);
          connectionTimeoutId = null;
        }
        if (checkConnectionInterval) {
          clearInterval(checkConnectionInterval);
          checkConnectionInterval = null;
        }
      }
    }, 500);

    logger.debug(
      `[WebSocket] Subscription complete, now connecting to WebSocket...`
    );
    // Устанавливаем соединение (если еще не установлено)
    // Это должно быть ПОСЛЕ подписки, чтобы не пропустить данные
    wsConnectionManager.connect(params);
  });
}
