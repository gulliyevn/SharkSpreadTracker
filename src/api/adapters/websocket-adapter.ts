/**
 * WebSocket адаптер с fallback на HTTP polling
 * 
 * ОЖИДАЕТСЯ ДОКУМЕНТАЦИЯ ОТ БЭКЕНДА
 * 
 * Архитектура:
 * - Пытается использовать WebSocket для real-time обновлений
 * - При ошибке WebSocket автоматически переключается на HTTP polling
 * - При восстановлении WebSocket переключается обратно
 * - Интегрируется с React Query для обновления кэша
 */

import { createWebSocketClient, WebSocketClient, type WebSocketStatus } from '../clients/websocket.client';
import { queryClient } from '@/lib/react-query';
import { logger } from '@/utils/logger';
import type { Token, SpreadResponse, TimeframeOption } from '@/types';
import type { AllPrices } from '../endpoints/prices.api';
import type { TokenWithData } from '../endpoints/tokens.api';

/**
 * Интерфейс для адаптера real-time данных
 */
export interface IRealtimeAdapter {
  // Подписка на обновления токена
  subscribeToToken(token: Token, callback: (data: TokenWithData) => void): () => void;
  
  // Подписка на обновления спреда
  subscribeToSpread(token: Token, timeframe: TimeframeOption, callback: (data: SpreadResponse) => void): () => void;
  
  // Подписка на обновления цен
  subscribeToPrices(token: Token, callback: (data: AllPrices) => void): () => void;
  
  // Получить статус подключения
  getStatus(): WebSocketStatus;
  
  // Подключиться
  connect(): void;
  
  // Отключиться
  disconnect(): void;
}

/**
 * WebSocket адаптер с fallback на HTTP polling
 */
export class WebSocketRealtimeAdapter implements IRealtimeAdapter {
  private wsClient: WebSocketClient;
  private fallbackToPolling = false;
  private pollingIntervals: Map<string, number> = new Map();
  private status: WebSocketStatus = 'disconnected';

  constructor() {
    this.wsClient = createWebSocketClient();
    
    // Подписываемся на изменения статуса WebSocket
    this.wsClient.onStatusChange((status) => {
      this.status = status;
      
      // Если WebSocket отключился, переключаемся на polling
      if (status === 'disconnected' || status === 'error') {
        this.enableFallback();
      } else if (status === 'connected') {
        this.disableFallback();
      }
    });
  }

  /**
   * Подключиться к WebSocket
   */
  connect(): void {
    this.wsClient.connect();
  }

  /**
   * Отключиться от WebSocket
   */
  disconnect(): void {
    this.wsClient.disconnect();
    this.clearAllPolling();
  }

  /**
   * Получить статус подключения
   */
  getStatus(): WebSocketStatus {
    return this.status;
  }

  /**
   * Подписаться на обновления токена
   */
  subscribeToToken(token: Token, callback: (data: TokenWithData) => void): () => void {
    const key = `token-${token.symbol}-${token.chain}`;

    if (this.wsClient.isConnected() && !this.fallbackToPolling) {
      // Используем WebSocket
      this.wsClient.subscribe(key);
      
      const unsubscribe = this.wsClient.onMessage((_message) => {
        // TODO: Обработать сообщение согласно протоколу бэкенда
        // if (_message.type === 'token_update' && _message.data.token === token) {
        //   callback(_message.data);
        //   // Обновить React Query кэш
        //   queryClient.setQueryData(['tokens', token.symbol, token.chain], _message.data);
        // }
      });

      return () => {
        this.wsClient.unsubscribe(key);
        unsubscribe();
      };
    } else {
      // Fallback на HTTP polling
      return this.subscribeToTokenPolling(token, callback);
    }
  }

  /**
   * Подписаться на обновления спреда
   */
  subscribeToSpread(
    token: Token,
    timeframe: TimeframeOption,
    callback: (data: SpreadResponse) => void
  ): () => void {
    const key = `spread-${token.symbol}-${token.chain}-${timeframe}`;

    if (this.wsClient.isConnected() && !this.fallbackToPolling) {
      // Используем WebSocket
      this.wsClient.subscribe(key);
      
      const unsubscribe = this.wsClient.onMessage((_message) => {
        // TODO: Обработать сообщение согласно протоколу бэкенда
        // if (_message.type === 'spread_update' && _message.data.token === token) {
        //   callback(_message.data);
        //   queryClient.setQueryData(['spread', token.symbol, token.chain, timeframe], _message.data);
        // }
      });

      return () => {
        this.wsClient.unsubscribe(key);
        unsubscribe();
      };
    } else {
      // Fallback на HTTP polling
      return this.subscribeToSpreadPolling(token, timeframe, callback);
    }
  }

  /**
   * Подписаться на обновления цен
   */
  subscribeToPrices(token: Token, callback: (data: AllPrices) => void): () => void {
    const key = `prices-${token.symbol}-${token.chain}`;

    if (this.wsClient.isConnected() && !this.fallbackToPolling) {
      // Используем WebSocket
      this.wsClient.subscribe(key);
      
      const unsubscribe = this.wsClient.onMessage((_message) => {
        // TODO: Обработать сообщение согласно протоколу бэкенда
        // if (_message.type === 'prices_update' && _message.data.token === token) {
        //   callback(_message.data);
        //   queryClient.setQueryData(['prices', token.symbol, token.chain], _message.data);
        // }
      });

      return () => {
        this.wsClient.unsubscribe(key);
        unsubscribe();
      };
    } else {
      // Fallback на HTTP polling
      return this.subscribeToPricesPolling(token, callback);
    }
  }

  /**
   * Fallback: подписка на токен через HTTP polling
   */
  private subscribeToTokenPolling(token: Token, callback: (data: TokenWithData) => void): () => void {
    const key = `token-${token.symbol}-${token.chain}`;
    
    // Импортируем функцию динамически
    const fetchData = async () => {
      try {
        const { getAllTokens } = await import('../endpoints/tokens.api');
        const tokens = await getAllTokens();
        const tokenData = tokens.find(
          (t) => t.symbol === token.symbol && t.chain === token.chain
        );
        if (tokenData) {
          callback(tokenData);
        }
      } catch (error) {
        logger.error('[WebSocketAdapter] Polling error:', error);
      }
    };

    // Первый запрос сразу
    fetchData();

    // Затем каждые 5 секунд
    const interval = window.setInterval(fetchData, 5000);
    this.pollingIntervals.set(key, interval);

    return () => {
      const intervalId = this.pollingIntervals.get(key);
      if (intervalId) {
        clearInterval(intervalId);
        this.pollingIntervals.delete(key);
      }
    };
  }

  /**
   * Fallback: подписка на спред через HTTP polling
   */
  private subscribeToSpreadPolling(
    token: Token,
    timeframe: TimeframeOption,
    callback: (data: SpreadResponse) => void
  ): () => void {
    const key = `spread-${token.symbol}-${token.chain}-${timeframe}`;
    
    const fetchData = async () => {
      try {
        const { getSpreadData } = await import('../endpoints/spreads.api');
        const data = await getSpreadData(token, timeframe);
        callback(data);
        // Обновить React Query кэш
        queryClient.setQueryData(['spread', token.symbol, token.chain, timeframe], data);
      } catch (error) {
        logger.error('[WebSocketAdapter] Polling error:', error);
      }
    };

    fetchData();
    const interval = window.setInterval(fetchData, 5000);
    this.pollingIntervals.set(key, interval);

    return () => {
      const intervalId = this.pollingIntervals.get(key);
      if (intervalId) {
        clearInterval(intervalId);
        this.pollingIntervals.delete(key);
      }
    };
  }

  /**
   * Fallback: подписка на цены через HTTP polling
   */
  private subscribeToPricesPolling(token: Token, callback: (data: AllPrices) => void): () => void {
    const key = `prices-${token.symbol}-${token.chain}`;
    
    const fetchData = async () => {
      try {
        const { getAllPrices } = await import('../endpoints/prices.api');
        const data = await getAllPrices(token);
        callback(data);
        // Обновить React Query кэш
        queryClient.setQueryData(['prices', token.symbol, token.chain], data);
      } catch (error) {
        logger.error('[WebSocketAdapter] Polling error:', error);
      }
    };

    fetchData();
    const interval = window.setInterval(fetchData, 5000);
    this.pollingIntervals.set(key, interval);

    return () => {
      const intervalId = this.pollingIntervals.get(key);
      if (intervalId) {
        clearInterval(intervalId);
        this.pollingIntervals.delete(key);
      }
    };
  }

  /**
   * Включить fallback на polling
   */
  private enableFallback(): void {
    if (!this.fallbackToPolling) {
      logger.warn('[WebSocketAdapter] WebSocket disconnected, enabling HTTP polling fallback');
      this.fallbackToPolling = true;
    }
  }

  /**
   * Отключить fallback (вернуться на WebSocket)
   */
  private disableFallback(): void {
    if (this.fallbackToPolling) {
      logger.info('[WebSocketAdapter] WebSocket reconnected, disabling HTTP polling fallback');
      this.fallbackToPolling = false;
      this.clearAllPolling();
    }
  }

  /**
   * Очистить все polling интервалы
   */
  private clearAllPolling(): void {
    this.pollingIntervals.forEach((interval) => {
      clearInterval(interval);
    });
    this.pollingIntervals.clear();
  }
}

// Singleton экземпляр
let realtimeAdapterInstance: IRealtimeAdapter | null = null;

/**
 * Получить экземпляр real-time адаптера
 */
export function getRealtimeAdapter(): IRealtimeAdapter {
  if (!realtimeAdapterInstance) {
    realtimeAdapterInstance = new WebSocketRealtimeAdapter();
  }
  return realtimeAdapterInstance;
}

