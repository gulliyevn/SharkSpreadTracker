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

const CONNECTION_TIMEOUT = 30000; // 30 секунд для установления соединения
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000]; // Экспоненциальная задержка, макс 30s
const MAX_RECONNECT_ATTEMPTS = 10;

class WebSocketConnectionManager {
  private static instance: WebSocketConnectionManager | null = null;
  private ws: WebSocket | null = null;
  private subscribers: Set<MessageCallback> = new Set();
  private errorCallbacks: Set<ErrorCallback> = new Set();
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connectionTimer: ReturnType<typeof setTimeout> | null = null;
  private isConnecting = false;
  private params: WebSocketParams = {};
  private url: string = '';

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
      this.isConnecting = false;
      this.reconnectAttempts = 0; // Сброс счетчика при успешном подключении
      if (this.connectionTimer) {
        clearTimeout(this.connectionTimer);
        this.connectionTimer = null;
      }
      setConnectionStatus('connected');
    };

    this.ws.onmessage = async (event) => {
      try {
        let textData: string;

        if (typeof event.data === 'string') {
          textData = event.data;
        } else if (event.data instanceof Blob) {
          textData = await event.data.text();
        } else if (event.data instanceof ArrayBuffer) {
          textData = new TextDecoder().decode(event.data);
        } else {
          logger.warn('[WS Manager] Unknown message type:', typeof event.data);
          return;
        }

        const parsedRows = parseWebSocketMessage(textData);

        if (parsedRows.length > 0) {
          logger.debug(
            `[WS Manager] Received ${parsedRows.length} rows, notifying ${this.subscribers.size} subscribers`
          );
          this.notifySubscribers(parsedRows);
        }
      } catch (error) {
        logger.error('[WS Manager] Failed to process message:', error);
        this.notifyError(
          error instanceof Error ? error : new Error(String(error))
        );
      }
    };

    this.ws.onerror = (error) => {
      logger.error('[WS Manager] ❌ WebSocket error:', error);
      this.isConnecting = false;
      if (this.connectionTimer) {
        clearTimeout(this.connectionTimer);
        this.connectionTimer = null;
      }
      setConnectionStatus('error');
    };

    this.ws.onclose = (event) => {
      logger.info(
        `[WS Manager] 🔌 Connection closed: code=${event.code}, reason="${event.reason || 'none'}"`
      );

      this.isConnecting = false;
      this.ws = null;

      if (this.connectionTimer) {
        clearTimeout(this.connectionTimer);
        this.connectionTimer = null;
      }

      // Если это не было намеренное закрытие (code 1000 = normal closure)
      if (event.code !== 1000 && this.subscribers.size > 0) {
        logger.warn('[WS Manager] Unexpected close, will attempt reconnect');
        setConnectionStatus('disconnected');
        this.handleReconnect();
      } else {
        setConnectionStatus('disconnected');
      }
    };
  }

  /**
   * Уведомить всех подписчиков о новых данных
   */
  private notifySubscribers(data: StraightData[]): void {
    this.subscribers.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        logger.error('[WS Manager] Error in subscriber callback:', error);
      }
    });
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

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(this.params);
    }, delay);
  }

  /**
   * Закрыть соединение
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.isConnecting = false;
    this.reconnectAttempts = 0;
    setConnectionStatus('disconnected');
    logger.info('[WS Manager] Disconnected');
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
