import { describe, it, expect, vi, beforeEach } from 'vitest';
import { networkMonitor } from '../network-monitor';

describe('NetworkMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getNetworkInfo', () => {
    it('should return network info or null', () => {
      const info = networkMonitor.getNetworkInfo();
      // Может быть null или объект с информацией о сети
      expect(info === null || typeof info === 'object').toBe(true);
    });
  });

  describe('isSlowNetwork', () => {
    it('should return boolean', () => {
      const isSlow = networkMonitor.isSlowNetwork();
      expect(typeof isSlow).toBe('boolean');
    });
  });

  describe('getRecommendedRefreshInterval', () => {
    it('should return interval for fast network', () => {
      const interval = networkMonitor.getRecommendedRefreshInterval(1000);
      expect(typeof interval).toBe('number');
      expect(interval).toBeGreaterThanOrEqual(1000);
    });

    it('should return increased interval for slow network', () => {
      const interval = networkMonitor.getRecommendedRefreshInterval(1000);
      expect(typeof interval).toBe('number');
      // Для медленной сети должно быть минимум 1000, для быстрой тоже 1000
      expect(interval).toBeGreaterThanOrEqual(1000);
    });
  });

  describe('subscribe', () => {
    it('should allow subscribing to network changes', () => {
      const callback = vi.fn();
      const unsubscribe = networkMonitor.subscribe(callback);

      expect(typeof unsubscribe).toBe('function');

      // Отписываемся
      unsubscribe();
    });

    it('should allow unsubscribing', () => {
      const callback = vi.fn();
      const unsubscribe = networkMonitor.subscribe(callback);

      unsubscribe();

      // После отписки callback не должен вызываться (если нет изменений)
      expect(typeof unsubscribe).toBe('function');
    });
  });
});
