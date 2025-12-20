/**
 * WebSocket клиент для real-time обновлений данных
 * 
 * ОЖИДАЕТСЯ ДОКУМЕНТАЦИЯ ОТ БЭКЕНДА
 * 
 * После получения документации нужно будет:
 * 1. Настроить URL WebSocket (wss://your-backend.com/ws)
 * 2. Реализовать протокол сообщений согласно документации
 * 3. Настроить подписки на токены
 * 
 * Архитектура:
 * - Автоматическое переподключение при разрыве
 * - Fallback на HTTP polling при ошибках
 * - Управление подписками (subscribe/unsubscribe)
 * - Обработка ошибок
 */

import { logger } from '@/utils/logger';
import { WEBSOCKET_URL } from '@/constants/api';

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface WebSocketMessage {
  type: string;
  data: unknown;
  timestamp?: number;
}

export type WebSocketMessageHandler = (message: WebSocketMessage) => void;
export type WebSocketStatusHandler = (status: WebSocketStatus) => void;

/**
 * WebSocket клиент с автоматическим переподключением
 */
export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Начальная задержка 1 секунда
  private reconnectTimer: number | null = null;
  private status: WebSocketStatus = 'disconnected';
  private messageHandlers: Set<WebSocketMessageHandler> = new Set();
  private statusHandlers: Set<WebSocketStatusHandler> = new Set();
  private subscriptions: Set<string> = new Set(); // Подписки на токены
  private shouldReconnect = true;

  constructor(url: string) {
    this.url = url;
  }

  /**
   * Подключиться к WebSocket
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      logger.warn('[WebSocket] Already connected');
      return;
    }

    if (this.ws?.readyState === WebSocket.CONNECTING) {
      logger.warn('[WebSocket] Connection in progress');
      return;
    }

    this.setStatus('connecting');

    try {
      // TODO: После получения документации настроить URL и параметры подключения
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        logger.info('[WebSocket] Connected');
        this.setStatus('connected');
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;

        // Восстанавливаем подписки после переподключения
        this.resubscribe();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          this.handleMessage(message);
        } catch (error) {
          logger.error('[WebSocket] Failed to parse message:', error);
        }
      };

      this.ws.onerror = (error) => {
        logger.error('[WebSocket] Error:', error);
        this.setStatus('error');
      };

      this.ws.onclose = (event) => {
        logger.warn('[WebSocket] Disconnected:', event.code, event.reason);
        this.setStatus('disconnected');
        this.ws = null;

        // Автоматическое переподключение
        if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };
    } catch (error) {
      logger.error('[WebSocket] Failed to create connection:', error);
      this.setStatus('error');
    }
  }

  /**
   * Отключиться от WebSocket
   */
  disconnect(): void {
    this.shouldReconnect = false;

    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.setStatus('disconnected');
  }

  /**
   * Подписаться на сообщения
   */
  onMessage(handler: WebSocketMessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  /**
   * Подписаться на изменения статуса
   */
  onStatusChange(handler: WebSocketStatusHandler): () => void {
    this.statusHandlers.add(handler);
    // Сразу вызываем с текущим статусом
    handler(this.status);
    return () => {
      this.statusHandlers.delete(handler);
    };
  }

  /**
   * Получить текущий статус
   */
  getStatus(): WebSocketStatus {
    return this.status;
  }

  /**
   * Проверить, подключен ли WebSocket
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Подписаться на токен (после получения документации)
   * TODO: Реализовать согласно протоколу бэкенда
   */
  subscribe(token: string): void {
    if (!this.isConnected()) {
      logger.warn('[WebSocket] Cannot subscribe: not connected');
      return;
    }

    this.subscriptions.add(token);

    // TODO: Отправить сообщение подписки согласно протоколу бэкенда
    // Пример:
    // this.send({
    //   type: 'subscribe',
    //   token: token
    // });
  }

  /**
   * Отписаться от токена
   * TODO: Реализовать согласно протоколу бэкенда
   */
  unsubscribe(token: string): void {
    if (!this.isConnected()) {
      return;
    }

    this.subscriptions.delete(token);

    // TODO: Отправить сообщение отписки согласно протоколу бэкенда
    // Пример:
    // this.send({
    //   type: 'unsubscribe',
    //   token: token
    // });
  }

  /**
   * Отправить сообщение
   * TODO: Реализовать согласно протоколу бэкенда
   * @internal - будет использоваться в subscribe/unsubscribe после получения документации
   */
  // @ts-expect-error - метод будет использоваться после получения документации от бэкенда
  private send(_message: unknown): void {
    if (!this.isConnected()) {
      logger.warn('[WebSocket] Cannot send: not connected');
      return;
    }

    try {
      this.ws?.send(JSON.stringify(_message));
    } catch (error) {
      logger.error('[WebSocket] Failed to send message:', error);
    }
  }

  /**
   * Обработать входящее сообщение
   */
  private handleMessage(message: WebSocketMessage): void {
    // TODO: Обработать сообщение согласно протоколу бэкенда
    // Пример обработки:
    // if (message.type === 'price_update') {
    //   // Обновить данные в React Query кэше
    // }

    this.messageHandlers.forEach((handler) => {
      try {
        handler(message);
      } catch (error) {
        logger.error('[WebSocket] Error in message handler:', error);
      }
    });
  }

  /**
   * Восстановить подписки после переподключения
   */
  private resubscribe(): void {
    this.subscriptions.forEach((token) => {
      this.subscribe(token);
    });
  }

  /**
   * Запланировать переподключение
   */
  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Максимум 30 секунд
    );

    logger.info(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = window.setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Установить статус и уведомить подписчиков
   */
  private setStatus(status: WebSocketStatus): void {
    if (this.status === status) {
      return;
    }

    this.status = status;
    this.statusHandlers.forEach((handler) => {
      try {
        handler(status);
      } catch (error) {
        logger.error('[WebSocket] Error in status handler:', error);
      }
    });
  }
}

/**
 * Создать WebSocket клиент
 * TODO: Настроить URL после получения документации
 */
export function createWebSocketClient(): WebSocketClient {
  return new WebSocketClient(WEBSOCKET_URL);
}

