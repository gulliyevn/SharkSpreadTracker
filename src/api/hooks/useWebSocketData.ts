/**
 * React Query hook для real-time данных через WebSocket с fallback на HTTP polling
 * 
 * ОЖИДАЕТСЯ ДОКУМЕНТАЦИЯ ОТ БЭКЕНДА
 * 
 * После получения документации нужно будет:
 * 1. Настроить обработку сообщений WebSocket
 * 2. Интегрировать с React Query для обновления кэша
 * 3. Настроить подписки согласно протоколу бэкенда
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getRealtimeAdapter, type IRealtimeAdapter } from '../adapters/websocket-adapter';
import type { Token, TimeframeOption } from '@/types';

/**
 * Hook для real-time обновлений токена
 */
export function useRealtimeToken(token: Token | null) {
  const queryClient = useQueryClient();
  const adapterRef = useRef<IRealtimeAdapter | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    const adapter = getRealtimeAdapter();
    adapterRef.current = adapter;

    // Подключаемся, если еще не подключены
    if (adapter.getStatus() === 'disconnected') {
      adapter.connect();
    }

    // Подписываемся на обновления
    unsubscribeRef.current = adapter.subscribeToToken(token, (data) => {
      // Обновляем React Query кэш
      queryClient.setQueryData(['tokens', token.symbol, token.chain], data);
      queryClient.invalidateQueries({ queryKey: ['tokens'] });
    });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [token, queryClient]);

  return {
    status: adapterRef.current?.getStatus() || 'disconnected',
  };
}

/**
 * Hook для real-time обновлений спреда
 */
export function useRealtimeSpread(
  token: Token | null,
  timeframe: TimeframeOption = '1h'
) {
  const queryClient = useQueryClient();
  const adapterRef = useRef<IRealtimeAdapter | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    const adapter = getRealtimeAdapter();
    adapterRef.current = adapter;

    if (adapter.getStatus() === 'disconnected') {
      adapter.connect();
    }

    unsubscribeRef.current = adapter.subscribeToSpread(token, timeframe, (data) => {
      queryClient.setQueryData(
        ['spread', token.symbol, token.chain, timeframe],
        data
      );
    });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [token, timeframe, queryClient]);

  return {
    status: adapterRef.current?.getStatus() || 'disconnected',
  };
}

/**
 * Hook для real-time обновлений цен
 */
export function useRealtimePrices(token: Token | null) {
  const queryClient = useQueryClient();
  const adapterRef = useRef<IRealtimeAdapter | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    const adapter = getRealtimeAdapter();
    adapterRef.current = adapter;

    if (adapter.getStatus() === 'disconnected') {
      adapter.connect();
    }

    unsubscribeRef.current = adapter.subscribeToPrices(token, (data) => {
      queryClient.setQueryData(['prices', token.symbol, token.chain], data);
    });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [token, queryClient]);

  return {
    status: adapterRef.current?.getStatus() || 'disconnected',
  };
}

