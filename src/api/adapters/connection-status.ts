/**
 * Управление статусом соединения с бэкендом
 */

import { logger } from '@/utils/logger';

export type ConnectionStatus =
  | 'connected'
  | 'connecting'
  | 'disconnected'
  | 'error';

let currentConnectionStatus: ConnectionStatus = 'disconnected';
const connectionStatusListeners: Set<(status: ConnectionStatus) => void> =
  new Set();

export function getConnectionStatus(): ConnectionStatus {
  return currentConnectionStatus;
}

export function subscribeToConnectionStatus(
  listener: (status: ConnectionStatus) => void
): () => void {
  connectionStatusListeners.add(listener);
  // Сразу вызываем с текущим статусом
  listener(currentConnectionStatus);
  return () => connectionStatusListeners.delete(listener);
}

export function setConnectionStatus(status: ConnectionStatus) {
  if (currentConnectionStatus !== status) {
    currentConnectionStatus = status;
    connectionStatusListeners.forEach((listener) => listener(status));
    logger.debug(`[API] Connection status changed: ${status}`);
  }
}
