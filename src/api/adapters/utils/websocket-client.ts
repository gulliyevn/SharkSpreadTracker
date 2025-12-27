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

  // ВАЖНО: Принудительно заменяем wss:// на ws://, так как сервер не поддерживает SSL
  // Это критично для production, где страница загружена по HTTPS, но сервер использует ws://
  const normalizedBaseUrl = baseUrl.replace(/^wss:\/\//, 'ws://');

  // Если baseUrl уже полный URL (начинается с ws://), используем его напрямую
  // Иначе создаем новый URL относительно текущего location
  let url: URL;
  if (normalizedBaseUrl.startsWith('ws://')) {
    // Явно создаем URL с ws:// протоколом
    url = new URL(normalizedBaseUrl);
  } else {
    url = new URL(
      normalizedBaseUrl,
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

  const finalUrl = url.toString();
  logger.debug('[WebSocket] Created URL:', {
    baseUrl,
    finalUrl,
    hasToken: !!params.token,
    hasNetwork: !!params.network,
  });

  return url;
}

/**
 * Парсит сообщение WebSocket
 */
export function parseWebSocketMessage(rawData: string): StraightData[] {
  // Диагностическое логирование: логируем длину сырых данных и первые 200 символов
  logger.debug('[WebSocket] Parsing message, raw data length:', rawData.length);
  if (rawData.length > 0) {
    logger.debug(
      '[WebSocket] Raw data preview (first 200 chars):',
      rawData.slice(0, 200)
    );
  }

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

  // Логируем тип результата (массив/объект) и количество элементов
  const isArray = Array.isArray(parsed);
  const itemCount = isArray ? (parsed as unknown[]).length : 1;
  logger.debug('[WebSocket] Parsed JSON:', {
    type: isArray ? 'array' : 'object',
    itemCount,
  });

  // Нормализуем в массив
  const list = Array.isArray(parsed) ? parsed : [parsed];

  // Обрабатываем пустой массив
  if (list.length === 0) {
    logger.debug('[WebSocket] Received empty array');
    return [];
  }

  // Логируем структуру первого элемента для диагностики
  if (list.length > 0 && list[0] && typeof list[0] === 'object') {
    logger.debug('[WebSocket] First item structure:', {
      keys: Object.keys(list[0] as Record<string, unknown>),
      sample: list[0],
    });
  }

  const rows: StraightData[] = [];
  let itemsSkipped = 0;
  const skippedServiceMessages: unknown[] = [];
  const skippedInvalidItems: unknown[] = [];

  // Обязательные поля согласно документации API
  const requiredFields = [
    'token',
    'aExchange',
    'bExchange',
    'priceA',
    'priceB',
    'spread',
    'network',
    'limit',
  ];

  // Известные служебные типы сообщений
  const serviceTypes = ['connected', 'ping', 'pong', 'heartbeat'];

  for (const item of list) {
    // Фильтруем только известные служебные сообщения
    // Валидные данные по документации НЕ содержат поле type
    if (
      item &&
      typeof item === 'object' &&
      'type' in item &&
      typeof (item as { type: unknown }).type === 'string' &&
      serviceTypes.includes(
        ((item as { type: string }).type as string).toLowerCase()
      )
    ) {
      if (skippedServiceMessages.length < 3) {
        skippedServiceMessages.push(item);
      }
      itemsSkipped++;
      continue;
    }

    // Проверяем, что элемент является объектом
    if (!item || typeof item !== 'object') {
      if (skippedInvalidItems.length < 3) {
        skippedInvalidItems.push(item);
      }
      itemsSkipped++;
      continue;
    }

    // Валидация обязательных полей согласно документации API
    const itemObj = item as Record<string, unknown>;
    const hasAllFields = requiredFields.every(
      (field) => field in itemObj && itemObj[field] != null
    );

    if (!hasAllFields) {
      const missingFields = requiredFields.filter(
        (field) => !(field in itemObj) || itemObj[field] == null
      );
      logger.warn('[WebSocket] Skipped item missing required fields:', {
        missingFields,
        item,
      });
      if (skippedInvalidItems.length < 3) {
        skippedInvalidItems.push(item);
      }
      itemsSkipped++;
      continue;
    }

    // Проверяем, что token не пустой
    if (!itemObj.token || String(itemObj.token).trim().length === 0) {
      if (skippedInvalidItems.length < 3) {
        skippedInvalidItems.push(item);
      }
      itemsSkipped++;
      continue;
    }

    rows.push(item as StraightData);
  }

  // Логируем примеры отфильтрованных элементов
  if (skippedServiceMessages.length > 0) {
    logger.debug(
      '[WebSocket] Filtered service messages (examples):',
      skippedServiceMessages
    );
  }
  if (skippedInvalidItems.length > 0) {
    logger.debug(
      '[WebSocket] Filtered invalid items (examples):',
      skippedInvalidItems
    );
  }

  // Логируем итоговую статистику
  if (itemsSkipped > 0) {
    logger.debug(
      `[WebSocket] Skipped ${itemsSkipped} invalid items out of ${list.length} total`
    );
  }

  logger.debug(
    `[WebSocket] Successfully parsed ${rows.length} valid items out of ${list.length} total`
  );

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
