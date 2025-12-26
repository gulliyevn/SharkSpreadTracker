/**
 * WebSocket клиент для получения данных спредов
 */

import { logger } from '@/utils/logger';
import type { StraightData } from '@/types';

export interface WebSocketParams {
  token?: string;
  network?: string;
  signal?: AbortSignal;
}

export interface WebSocketConfig {
  url: string;
  timeout: number;
  maxReconnectAttempts: number;
  reconnectAttempt?: number;
}

/**
 * Обработчик сообщений WebSocket
 */
export interface MessageHandler {
  onMessage: (data: StraightData[]) => void;
  onError: (error: Event) => void;
  onClose: (event: CloseEvent) => void;
}

/**
 * Создает URL для WebSocket соединения
 */
export function createWebSocketUrl(
  baseUrl: string,
  params: WebSocketParams
): URL {
  if (!baseUrl || baseUrl.trim().length === 0) {
    throw new Error('WebSocket baseUrl cannot be empty');
  }

  // Если baseUrl уже полный URL (начинается с ws:// или wss://), используем его напрямую
  // Иначе создаем новый URL относительно текущего location
  let url: URL;
  if (baseUrl.startsWith('ws://') || baseUrl.startsWith('wss://')) {
    url = new URL(baseUrl);
  } else {
    url = new URL(
      baseUrl,
      typeof window !== 'undefined' ? window.location.href : 'http://localhost'
    );
  }

  // Добавляем query параметры если они указаны
  if (params.token) {
    url.searchParams.set('token', params.token);
  }
  if (params.network) {
    url.searchParams.set('network', params.network);
  }

  logger.debug('[WebSocket] Created URL:', {
    baseUrl,
    finalUrl: url.toString(),
    hasToken: !!params.token,
    hasNetwork: !!params.network,
  });

  return url;
}

/**
 * Парсит сообщение WebSocket
 */
export function parseWebSocketMessage(rawData: string): StraightData[] {
  // Проверяем, что данные не пустые
  if (!rawData || rawData.trim().length === 0) {
    logger.debug('[WebSocket] Received empty message');
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawData);
  } catch (err) {
    logger.error('[WebSocket] Failed to parse JSON:', err);
    logger.debug('[WebSocket] Raw data preview:', rawData.slice(0, 500));
    throw new Error(
      `Invalid JSON: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // Нормализуем в массив
  const list = Array.isArray(parsed) ? parsed : [parsed];

  // Обрабатываем пустой массив
  if (list.length === 0) {
    logger.debug('[WebSocket] Received empty array');
    return [];
  }

  const rows: StraightData[] = [];
  let itemsSkipped = 0;

  for (const item of list) {
    // Игнорируем служебные сообщения типа {"type":"connected"}
    if (
      item &&
      typeof item === 'object' &&
      'type' in item &&
      item.type !== undefined
    ) {
      logger.debug('[WebSocket] Ignoring service message:', item);
      itemsSkipped++;
      continue;
    }

    // Проверяем, что элемент является объектом с обязательным полем 'token'
    if (
      item &&
      typeof item === 'object' &&
      'token' in item &&
      item.token != null
    ) {
      rows.push(item as StraightData);
    } else {
      itemsSkipped++;
      if (itemsSkipped <= 3) {
        // Логируем только первые несколько для избежания спама
        logger.debug('[WebSocket] Skipped invalid item:', item);
      }
    }
  }

  if (itemsSkipped > 0) {
    logger.debug(
      `[WebSocket] Skipped ${itemsSkipped} invalid items out of ${list.length} total`
    );
  }

  logger.debug(`[WebSocket] Successfully parsed ${rows.length} valid items`);

  return rows;
}

/**
 * Обрабатывает данные WebSocket (строка или Blob)
 */
export async function processWebSocketData(
  data: string | Blob,
  onParsed: (rows: StraightData[]) => void
): Promise<void> {
  try {
    let rawData: string;

    if (typeof data === 'string') {
      rawData = data;
    } else if (data instanceof Blob) {
      logger.debug('[WebSocket] Converting Blob to text, size:', data.size);
      rawData = await data.text();
      logger.debug('[WebSocket] Blob converted, text length:', rawData.length);
    } else {
      logger.error('[WebSocket] Unknown data type:', typeof data);
      return;
    }

    logger.debug('[WebSocket] Parsing message, length:', rawData.length);
    const rows = parseWebSocketMessage(rawData);
    logger.debug('[WebSocket] Parsed rows:', rows.length);
    onParsed(rows);
  } catch (err) {
    logger.error('[WebSocket] Error processing data:', err);
    if (typeof data === 'string') {
      logger.debug('[WebSocket] Raw data start:', data.slice(0, 200));
      logger.debug('[WebSocket] Raw data end:', data.slice(-200));
    }
  }
}
