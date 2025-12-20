/**
 * Backend Health Check Utility
 * 
 * Периодически проверяет доступность бэкенда и предоставляет статус для UI
 */

import { checkBackendHealth } from '@/api/adapters/api-adapter';
import { logger } from './logger';

export type BackendHealthStatus = 'unknown' | 'healthy' | 'unhealthy';

interface BackendHealthState {
  status: BackendHealthStatus;
  lastCheck: number | null;
  isChecking: boolean;
}

class BackendHealthMonitor {
  private state: BackendHealthState = {
    status: 'unknown',
    lastCheck: null,
    isChecking: false,
  };

  private listeners: Set<(status: BackendHealthStatus) => void> = new Set();
  private intervalId: NodeJS.Timeout | null = null;
  private readonly checkInterval = 30000; // 30 секунд

  /**
   * Подписаться на изменения статуса
   */
  subscribe(callback: (status: BackendHealthStatus) => void): () => void {
    this.listeners.add(callback);
    // Сразу вызываем callback с текущим статусом
    callback(this.state.status);

    // Возвращаем функцию отписки
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Получить текущий статус
   */
  getStatus(): BackendHealthStatus {
    return this.state.status;
  }

  /**
   * Получить время последней проверки
   */
  getLastCheck(): number | null {
    return this.state.lastCheck;
  }

  /**
   * Проверить доступность бэкенда
   */
  async checkHealth(): Promise<boolean> {
    if (this.state.isChecking) {
      // Уже проверяем, не запускаем параллельную проверку
      return this.state.status === 'healthy';
    }

    this.state.isChecking = true;

    try {
      const isHealthy = await checkBackendHealth();
      this.state.status = isHealthy ? 'healthy' : 'unhealthy';
      this.state.lastCheck = Date.now();

      // Уведомляем всех подписчиков
      this.notifyListeners();

      if (import.meta.env.DEV) {
        logger.debug(`[BackendHealth] Health check: ${isHealthy ? 'healthy' : 'unhealthy'}`);
      }

      return isHealthy;
    } catch (error) {
      this.state.status = 'unhealthy';
      this.state.lastCheck = Date.now();
      this.notifyListeners();

      if (import.meta.env.DEV) {
        logger.warn('[BackendHealth] Health check failed:', error);
      }

      return false;
    } finally {
      this.state.isChecking = false;
    }
  }

  /**
   * Запустить периодическую проверку
   */
  start(): void {
    if (this.intervalId !== null) {
      // Уже запущено
      return;
    }

    // Первая проверка сразу
    this.checkHealth().catch((error) => {
      logger.error('[BackendHealth] Initial health check failed:', error);
    });

    // Затем каждые 30 секунд
    this.intervalId = setInterval(() => {
      this.checkHealth().catch((error) => {
        logger.error('[BackendHealth] Periodic health check failed:', error);
      });
    }, this.checkInterval);

    if (import.meta.env.DEV) {
      logger.debug('[BackendHealth] Started periodic health checks (every 30s)');
    }
  }

  /**
   * Остановить периодическую проверку
   */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;

      if (import.meta.env.DEV) {
        logger.debug('[BackendHealth] Stopped periodic health checks');
      }
    }
  }

  /**
   * Уведомить всех подписчиков об изменении статуса
   */
  private notifyListeners(): void {
    this.listeners.forEach((callback) => {
      try {
        callback(this.state.status);
      } catch (error) {
        logger.error('[BackendHealth] Error in listener callback:', error);
      }
    });
  }
}

// Singleton экземпляр
export const backendHealthMonitor = new BackendHealthMonitor();

