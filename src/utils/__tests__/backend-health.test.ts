import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { backendHealthMonitor, type BackendHealthStatus } from '../backend-health';
import { checkBackendHealth } from '@/api/adapters/api-adapter';
import { logger } from '../logger';

vi.mock('@/api/adapters/api-adapter', () => ({
  checkBackendHealth: vi.fn(),
}));

vi.mock('../logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('backend-health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Сбрасываем состояние монитора
    backendHealthMonitor.stop();
  });

  afterEach(() => {
    backendHealthMonitor.stop();
  });

  describe('getStatus', () => {
    it('should return unknown status initially', () => {
      expect(backendHealthMonitor.getStatus()).toBe('unknown');
    });
  });

  describe('getLastCheck', () => {
    it('should return null initially', () => {
      expect(backendHealthMonitor.getLastCheck()).toBeNull();
    });
  });

  describe('checkHealth', () => {
    it('should check health and update status to healthy', async () => {
      vi.mocked(checkBackendHealth).mockResolvedValue(true);

      const result = await backendHealthMonitor.checkHealth();

      expect(result).toBe(true);
      expect(backendHealthMonitor.getStatus()).toBe('healthy');
      expect(backendHealthMonitor.getLastCheck()).not.toBeNull();
    });

    it('should check health and update status to unhealthy', async () => {
      vi.mocked(checkBackendHealth).mockResolvedValue(false);

      const result = await backendHealthMonitor.checkHealth();

      expect(result).toBe(false);
      expect(backendHealthMonitor.getStatus()).toBe('unhealthy');
      expect(backendHealthMonitor.getLastCheck()).not.toBeNull();
    });

    it('should not run parallel checks', async () => {
      let resolveFirst: ((value: boolean) => void) | undefined;
      const firstPromise = new Promise<boolean>((resolve) => {
        resolveFirst = resolve;
      });
      
      vi.mocked(checkBackendHealth).mockImplementationOnce(() => firstPromise);

      const promise1 = backendHealthMonitor.checkHealth();
      
      // Второй вызов должен вернуть текущий статус (unknown), так как первый еще в процессе
      const promise2 = backendHealthMonitor.checkHealth();

      // Первый запрос должен быть вызван
      expect(checkBackendHealth).toHaveBeenCalledTimes(1);
      
      // Разрешаем первый запрос
      resolveFirst!(true);
      
      const result1 = await promise1;
      const result2 = await promise2;

      // Первый должен вернуть true, второй должен вернуть false (так как isChecking был true)
      expect(result1).toBe(true);
      // Второй вызов возвращает текущий статус (unknown), который false
      expect(result2).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(checkBackendHealth).mockRejectedValue(new Error('Network error'));

      const result = await backendHealthMonitor.checkHealth();

      expect(result).toBe(false);
      expect(backendHealthMonitor.getStatus()).toBe('unhealthy');
    });
  });

  describe('subscribe', () => {
    it('should subscribe to status changes', () => {
      const callback = vi.fn();
      const unsubscribe = backendHealthMonitor.subscribe(callback);

      // Callback должен быть вызван с текущим статусом (может быть unknown или unhealthy)
      expect(callback).toHaveBeenCalled();
      const status = callback.mock.calls[0][0];
      expect(['unknown', 'healthy', 'unhealthy']).toContain(status);
      
      unsubscribe();
    });

    it('should notify listeners on status change', async () => {
      const callback = vi.fn();
      backendHealthMonitor.subscribe(callback);
      
      // Очищаем вызов при подписке
      callback.mockClear();

      vi.mocked(checkBackendHealth).mockResolvedValue(true);
      await backendHealthMonitor.checkHealth();

      expect(callback).toHaveBeenCalledWith('healthy');
    });

    it('should allow unsubscribing', () => {
      const callback = vi.fn();
      const unsubscribe = backendHealthMonitor.subscribe(callback);

      unsubscribe();

      vi.mocked(checkBackendHealth).mockResolvedValue(true);
      backendHealthMonitor.checkHealth();

      // Callback не должен быть вызван после отписки
      expect(callback).toHaveBeenCalledTimes(1); // Только при подписке
    });

    it('should handle multiple subscribers', async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      backendHealthMonitor.subscribe(callback1);
      backendHealthMonitor.subscribe(callback2);

      vi.mocked(checkBackendHealth).mockResolvedValue(true);
      await backendHealthMonitor.checkHealth();

      expect(callback1).toHaveBeenCalledWith('healthy');
      expect(callback2).toHaveBeenCalledWith('healthy');
    });
  });

  describe('start', () => {
    it('should start periodic health checks', async () => {
      vi.useFakeTimers();
      vi.mocked(checkBackendHealth).mockResolvedValue(true);

      backendHealthMonitor.start();

      // Пропускаем один интервал
      await vi.advanceTimersByTimeAsync(30000);

      expect(checkBackendHealth).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('should stop when stop is called', async () => {
      vi.useFakeTimers();
      vi.mocked(checkBackendHealth).mockResolvedValue(true);

      backendHealthMonitor.start();
      backendHealthMonitor.stop();

      const callCount = vi.mocked(checkBackendHealth).mock.calls.length;

      await vi.advanceTimersByTimeAsync(30000);

      // Количество вызовов не должно увеличиться после stop
      expect(vi.mocked(checkBackendHealth).mock.calls.length).toBe(callCount);

      vi.useRealTimers();
    });
  });

  describe('stop', () => {
    it('should stop periodic health checks', async () => {
      vi.useFakeTimers();
      vi.mocked(checkBackendHealth).mockResolvedValue(true);

      backendHealthMonitor.start();
      backendHealthMonitor.stop();

      const callCount = vi.mocked(checkBackendHealth).mock.calls.length;

      await vi.advanceTimersByTimeAsync(60000);

      expect(vi.mocked(checkBackendHealth).mock.calls.length).toBe(callCount);

      vi.useRealTimers();
    });
  });
});

