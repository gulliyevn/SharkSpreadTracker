/**
 * WebSocket Connection Manager для управления постоянным соединением
 *
 * Бэкенд ожидает keep-alive соединение (одно постоянное открытое соединение),
 * а не request-response паттерн (новое соединение для каждого запроса).
 *
 * Этот менеджер:
 * - Поддерживает одно соединение для всего приложения (Singleton)
 * - Автоматически переподключается при разрыве
 * - Позволяет множественным подписчикам получать сообщения
 * - Обрабатывает ошибки и таймауты
 */

import { logger } from '@/utils/logger';
import { WEBSOCKET_URL } from '@/constants/api';
import {
  parseWebSocketMessage,
  type WebSocketParams,
  createWebSocketUrl,
} from './utils/websocket-client';
import type { StraightData } from '@/types';
import { setConnectionStatus } from './connection-status';

type MessageCallback = (data: StraightData[]) => void;
type ErrorCallback = (error: Error) => void;
type CloseCallback = (event: {
  code: number;
  wasClean: boolean;
  hadData: boolean;
}) => void;

const CONNECTION_TIMEOUT = 30000; // 30 секунд для установления соединения
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000]; // Экспоненциальная задержка, макс 30s
const MAX_RECONNECT_ATTEMPTS = 10;

class WebSocketConnectionManager {
  private static instance: WebSocketConnectionManager | null = null;
  private ws: WebSocket | null = null;
  private subscribers: Set<MessageCallback> = new Set();
  private errorCallbacks: Set<ErrorCallback> = new Set();
  private closeCallbacks: Set<CloseCallback> = new Set();
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connectionTimer: ReturnType<typeof setTimeout> | null = null;
  private isConnecting = false;
  private params: WebSocketParams = {};
  private url: string = '';
  // Буфер последних полученных данных для новых подписчиков
  private lastData: StraightData[] | null = null;

  private constructor() {
    // Private constructor for Singleton
  }

  static getInstance(): WebSocketConnectionManager {
    if (!WebSocketConnectionManager.instance) {
      WebSocketConnectionManager.instance = new WebSocketConnectionManager();
    }
    return WebSocketConnectionManager.instance;
  }

  /**
   * Подписаться на сообщения
   */
  subscribe(callback: MessageCallback): () => void {
    this.subscribers.add(callback);
    logger.debug(
      `[WS Manager] Subscriber added. Total subscribers: ${this.subscribers.size}`
    );

    // Если уже есть последние данные, отправляем их новому подписчику сразу
    // Это решает проблему, когда данные приходят до создания подписки
    if (this.lastData && this.lastData.length > 0) {
      logger.info(
        `[WS Manager] ✅ Sending cached data (${this.lastData.length} rows) to new subscriber immediately`
      );
      try {
        // Вызываем синхронно, чтобы гарантировать, что данные попадут в callback
        // до того, как произойдет что-то еще
        callback(this.lastData);
        logger.debug('[WS Manager] Cached data sent successfully');
      } catch (error) {
        logger.error(
          '[WS Manager] Error sending cached data to subscriber:',
          error
        );
      }
    } else {
      logger.debug('[WS Manager] No cached data available for new subscriber');
    }

    // Если есть соединение, автоматически подключаемся
    if (!this.ws && !this.isConnecting) {
      this.connect(this.params);
    }

    // Возвращаем функцию для отписки
    return () => {
      this.subscribers.delete(callback);
      logger.debug(
        `[WS Manager] Subscriber removed. Total subscribers: ${this.subscribers.size}`
      );

      // Если больше нет подписчиков, можно закрыть соединение (опционально)
      // Но лучше оставить соединение открытым для будущих запросов
    };
  }

  /**
   * Подписаться на ошибки
   */
  onError(callback: ErrorCallback): () => void {
    this.errorCallbacks.add(callback);
    return () => {
      this.errorCallbacks.delete(callback);
    };
  }

  /**
   * Подписаться на закрытие соединения
   */
  onClose(callback: CloseCallback): () => void {
    this.closeCallbacks.add(callback);
    return () => {
      this.closeCallbacks.delete(callback);
    };
  }

  /**
   * Установить соединение
   */
  connect(params: WebSocketParams = {}): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      logger.debug('[WS Manager] Already connected');
      return;
    }

    if (this.isConnecting) {
      logger.debug('[WS Manager] Connection in progress');
      return;
    }

    if (!WEBSOCKET_URL) {
      logger.error('[WS Manager] WEBSOCKET_URL not configured');
      this.notifyError(new Error('WEBSOCKET_URL not configured'));
      return;
    }

    this.params = params;
    this.isConnecting = true;
    setConnectionStatus('connecting');

    try {
      const wsUrl = createWebSocketUrl(WEBSOCKET_URL, params);
      this.url = wsUrl.toString();

      logger.info(`[WS Manager] Connecting to: ${this.url}`);
      this.ws = new WebSocket(this.url);
      this.ws.binaryType = 'blob';

      // Таймаут для установления соединения
      this.connectionTimer = setTimeout(() => {
        if (this.ws?.readyState === WebSocket.CONNECTING) {
          logger.warn('[WS Manager] Connection timeout');
          this.ws.close();
          this.handleReconnect();
        }
      }, CONNECTION_TIMEOUT);

      this.setupEventHandlers();
    } catch (error) {
      logger.error('[WS Manager] Failed to create WebSocket:', error);
      this.isConnecting = false;
      this.notifyError(
        error instanceof Error ? error : new Error(String(error))
      );
      this.handleReconnect();
    }
  }

  /**
   * Настроить обработчики событий WebSocket
   */
  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      logger.info('[WS Manager] ✅ Connected successfully');
      logger.info('[WS Manager] WebSocket state:', {
        readyState: this.ws?.readyState,
        url: this.url,
        subscribers: this.subscribers.size,
        hasLastData: !!this.lastData,
        lastDataLength: this.lastData?.length || 0,
      });
      this.isConnecting = false;
      this.reconnectAttempts = 0; // Сброс счетчика при успешном подключении
      if (this.connectionTimer) {
        clearTimeout(this.connectionTimer);
        this.connectionTimer = null;
      }
      setConnectionStatus('connected');

      // ВАЖНО: После подключения бэкенд может отправить служебное сообщение {"type":"connected"}
      // Это нормально, нужно просто подождать реальных данных
      // Не закрываем соединение и не считаем это ошибкой

      // Логируем, что ждем данные от бэкенда
      logger.info(
        `[WS Manager] Waiting for data from backend (${this.subscribers.size} subscribers waiting)...`
      );
    };

    this.ws.onmessage = async (event) => {
      logger.info('[WS Manager] 📨 Message received!', {
        dataType: typeof event.data,
        isString: typeof event.data === 'string',
        isBlob: event.data instanceof Blob,
        isArrayBuffer: event.data instanceof ArrayBuffer,
        blobSize: event.data instanceof Blob ? event.data.size : undefined,
      });

      try {
        let textData: string;

        if (typeof event.data === 'string') {
          textData = event.data;
          logger.debug(
            '[WS Manager] Message is string, length:',
            textData.length
          );
        } else if (event.data instanceof Blob) {
          logger.debug('[WS Manager] Message is Blob, size:', event.data.size);
          textData = await event.data.text();
          logger.debug(
            '[WS Manager] Blob converted to text, length:',
            textData.length
          );
        } else if (event.data instanceof ArrayBuffer) {
          logger.debug(
            '[WS Manager] Message is ArrayBuffer, size:',
            event.data.byteLength
          );
          textData = new TextDecoder().decode(event.data);
          logger.debug(
            '[WS Manager] ArrayBuffer decoded, length:',
            textData.length
          );
        } else {
          logger.warn('[WS Manager] Unknown message type:', typeof event.data);
          return;
        }

        // Логируем первые 500 символов для диагностики
        logger.info(
          '[WS Manager] Raw message preview (first 500 chars):',
          textData.slice(0, 500)
        );
        logger.info('[WS Manager] Parsing message...');
        const parsedRows = parseWebSocketMessage(textData);
        logger.info(
          `[WS Manager] Parsed ${parsedRows.length} rows from message (total length: ${textData.length} chars)`
        );

        // Дополнительное логирование для диагностики
        if (parsedRows.length === 0 && textData.length > 0) {
          logger.warn(
            '[WS Manager] ⚠️ Message received but parsed to 0 rows. Raw message:',
            textData.slice(0, 1000)
          );
        }

        if (parsedRows.length > 0) {
          // Сохраняем последние данные для новых подписчиков
          this.lastData = parsedRows;
          logger.info(
            `[WS Manager] ✅ Received ${parsedRows.length} rows, notifying ${this.subscribers.size} subscribers`
          );
          this.notifySubscribers(parsedRows);
        } else {
          // Если получили только служебное сообщение (например, {"type":"connected"}),
          // это нормально - просто ждем реальных данных
          logger.debug(
            '[WS Manager] Received service message or empty data, waiting for actual data...'
          );
          // НЕ логируем это как предупреждение, так как это нормальное поведение
        }
      } catch (error) {
        logger.error('[WS Manager] Failed to process message:', error);
        this.notifyError(
          error instanceof Error ? error : new Error(String(error))
        );
      }
    };

    this.ws.onerror = (error) => {
      // Проверяем на Mixed Content проблему (HTTP → WSS)
      const isMixedContent =
        typeof window !== 'undefined' &&
        window.location.protocol === 'http:' &&
        this.url.startsWith('wss://');

      if (isMixedContent) {
        logger.error(
          '[WS Manager] ❌ Mixed Content Error: Cannot connect to wss:// from http:// page\n' +
            'Backend does not support insecure ws:// protocol (redirects to https://)\n' +
            'Solutions:\n' +
            '1. Set VITE_USE_MOCK_DATA=true in .env.local for development\n' +
            '2. OR setup local HTTPS for dev server\n' +
            '3. OR use production build (HTTPS)'
        );
      } else {
        logger.error('[WS Manager] ❌ WebSocket error:', error);
      }

      this.isConnecting = false;
      if (this.connectionTimer) {
        clearTimeout(this.connectionTimer);
        this.connectionTimer = null;
      }
      setConnectionStatus('error');
    };

    this.ws.onclose = (event) => {
      logger.info(
        `[WS Manager] 🔌 Connection closed: code=${event.code}, reason="${event.reason || 'none'}", wasClean=${event.wasClean}`
      );
      logger.info('[WS Manager] Connection state on close:', {
        hasLastData: !!this.lastData,
        lastDataLength: this.lastData?.length || 0,
        subscribers: this.subscribers.size,
      });

      // Уведомляем подписчиков о закрытии соединения
      const hadData = !!(this.lastData && this.lastData.length > 0);
      this.closeCallbacks.forEach((callback) => {
        try {
          callback({
            code: event.code,
            wasClean: event.wasClean,
            hadData,
          });
        } catch (err) {
          logger.error('[WS Manager] Error in close callback:', err);
        }
      });

      // Согласно документации API, бэкенд закрывает соединение после отправки данных (code 1000 = normal closure)
      // Это нормальное поведение для request-response паттерна через WebSocket
      if (event.code === 1000 && event.wasClean) {
        logger.info(
          '[WS Manager] Normal closure after data sent (request-response pattern)'
        );
        // Не переподключаемся автоматически - соединение закрыто нормально
        // Новые запросы создадут новое соединение
      }

      this.isConnecting = false;
      this.ws = null;

      if (this.connectionTimer) {
        clearTimeout(this.connectionTimer);
        this.connectionTimer = null;
      }

      // Если это не было намеренное закрытие (code 1000 = normal closure)
      // И есть подписчики, которые еще ждут данных - переподключаемся
      if (event.code !== 1000 && this.subscribers.size > 0) {
        // Проверяем, получили ли мы данные перед закрытием
        if (!this.lastData || this.lastData.length === 0) {
          logger.warn(
            `[WS Manager] Unexpected close (code=${event.code}) without receiving data, will attempt reconnect`
          );
          logger.warn('[WS Manager] Reconnect details:', {
            code: event.code,
            wasClean: event.wasClean,
            reason: event.reason || 'none',
            subscribers: this.subscribers.size,
            reconnectAttempts: this.reconnectAttempts,
            maxAttempts: MAX_RECONNECT_ATTEMPTS,
          });
        } else {
          logger.info(
            `[WS Manager] Connection closed (code=${event.code}) but data was received, not reconnecting`
          );
        }
        setConnectionStatus('disconnected');
        // Переподключаемся только если не получили данные
        if (!this.lastData || this.lastData.length === 0) {
          this.handleReconnect();
        }
      } else {
        setConnectionStatus('disconnected');

        // Логируем информацию о закрытии для диагностики
        if (event.code !== 1000) {
          logger.warn('[WS Manager] Connection closed with non-normal code:', {
            code: event.code,
            wasClean: event.wasClean,
            reason: event.reason || 'none',
            hadData: !!(this.lastData && this.lastData.length > 0),
            subscribers: this.subscribers.size,
          });
        }
      }
    };
  }

  /**
   * Уведомить всех подписчиков о новых данных
   */
  private notifySubscribers(data: StraightData[]): void {
    logger.info(
      `[WS Manager] Notifying ${this.subscribers.size} subscribers with ${data.length} rows`
    );
    let notifiedCount = 0;
    this.subscribers.forEach((callback) => {
      try {
        callback(data);
        notifiedCount++;
      } catch (error) {
        logger.error('[WS Manager] Error in subscriber callback:', error);
      }
    });
    logger.info(
      `[WS Manager] ✅ Notified ${notifiedCount} subscribers successfully`
    );
  }

  /**
   * Уведомить всех об ошибке
   */
  private notifyError(error: Error): void {
    this.errorCallbacks.forEach((callback) => {
      try {
        callback(error);
      } catch (err) {
        logger.error('[WS Manager] Error in error callback:', err);
      }
    });
  }

  /**
   * Обработка переподключения
   */
  private handleReconnect(): void {
    if (this.subscribers.size === 0) {
      logger.debug('[WS Manager] No subscribers, skipping reconnect');
      return;
    }

    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      logger.error('[WS Manager] Max reconnect attempts reached');
      this.notifyError(new Error('Max reconnection attempts reached'));

      // Логируем информацию о текущем состоянии для диагностики
      logger.error('[WS Manager] Connection state after max attempts:', {
        subscribers: this.subscribers.size,
        isConnecting: this.isConnecting,
        currentState: this.ws?.readyState ?? null,
        url: this.url,
      });

      // Очищаем таймер переподключения
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      return;
    }

    const delay =
      RECONNECT_DELAYS[
        Math.min(this.reconnectAttempts, RECONNECT_DELAYS.length - 1)
      ];
    this.reconnectAttempts++;

    logger.info(
      `[WS Manager] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`
    );

    // Очищаем предыдущий таймер переподключения, если он существует
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(this.params);
    }, delay);
  }

  /**
   * Закрыть соединение
   */
  disconnect(): void {
    logger.info('[WS Manager] Disconnecting...', {
      hasWebSocket: !!this.ws,
      readyState: this.ws?.readyState ?? null,
      subscribers: this.subscribers.size,
      isConnecting: this.isConnecting,
      hasReconnectTimer: !!this.reconnectTimer,
      hasConnectionTimer: !!this.connectionTimer,
    });

    // Останавливаем переподключение
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
      logger.debug('[WS Manager] Reconnect timer cleared');
    }

    // Очищаем таймер установки соединения
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
      logger.debug('[WS Manager] Connection timer cleared');
    }

    // Закрываем WebSocket соединение
    if (this.ws) {
      try {
        // Проверяем состояние перед закрытием
        if (
          this.ws.readyState === WebSocket.OPEN ||
          this.ws.readyState === WebSocket.CONNECTING
        ) {
          this.ws.close(1000, 'Client disconnect');
          logger.debug('[WS Manager] WebSocket closed with code 1000');
        } else {
          logger.debug(
            '[WS Manager] WebSocket already closed or closing, state:',
            this.ws.readyState
          );
        }
      } catch (error) {
        logger.error('[WS Manager] Error closing WebSocket:', error);
      } finally {
        this.ws = null;
      }
    }

    // Сбрасываем состояние
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    setConnectionStatus('disconnected');

    logger.info('[WS Manager] Disconnected successfully', {
      subscribers: this.subscribers.size,
    });
  }

  /**
   * Получить текущее состояние соединения
   */
  getState(): WebSocket['readyState'] | null {
    return this.ws?.readyState ?? null;
  }

  /**
   * Проверить, подключено ли соединение
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const wsConnectionManager = WebSocketConnectionManager.getInstance();
