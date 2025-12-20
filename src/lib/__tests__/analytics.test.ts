import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  analytics,
  initAnalytics,
  trackTokenView,
  trackTokenFilter,
  trackTokenSelected,
  trackLanguageChange,
  trackThemeChange,
} from '../analytics';

describe('analytics', () => {
  beforeEach(() => {
    analytics.clear();
    vi.clearAllMocks();
  });

  describe('track', () => {
    it('should track an event', () => {
      // Включаем аналитику для теста
      analytics.setEnabled(true);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      analytics.track('test_event', { key: 'value' });

      const events = analytics.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0]?.name).toBe('test_event');
      expect(events[0]?.properties).toEqual({ key: 'value' });
      expect(events[0]?.timestamp).toBeDefined();

      consoleSpy.mockRestore();
    });

    it('should limit events to maxEvents', () => {
      for (let i = 0; i < 150; i++) {
        analytics.track(`event_${i}`);
      }

      const events = analytics.getEvents();
      expect(events.length).toBeLessThanOrEqual(100);
    });

    it('should not track when disabled', () => {
      analytics.setEnabled(false);
      analytics.track('test_event');

      const events = analytics.getEvents();
      expect(events).toHaveLength(0);

      analytics.setEnabled(true);
    });
  });

  describe('pageView', () => {
    it('should track page view', () => {
      analytics.setEnabled(true);
      analytics.pageView('home', { section: 'header' });

      const events = analytics.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0]?.name).toBe('page_view');
      expect(events[0]?.properties).toEqual({
        page: 'home',
        section: 'header',
      });
    });
  });

  describe('getEvents', () => {
    it('should return a copy of events', () => {
      analytics.track('event1');
      analytics.track('event2');

      const events1 = analytics.getEvents();
      const events2 = analytics.getEvents();

      expect(events1).toEqual(events2);
      expect(events1).not.toBe(events2); // Different references
    });
  });

  describe('clear', () => {
    it('should clear all events', () => {
      analytics.setEnabled(true);
      analytics.track('event1');
      analytics.track('event2');

      expect(analytics.getEvents()).toHaveLength(2);

      analytics.clear();

      expect(analytics.getEvents()).toHaveLength(0);
    });
  });

  describe('setEnabled', () => {
    it('should enable/disable analytics', () => {
      analytics.setEnabled(false);
      analytics.track('event1');
      expect(analytics.getEvents()).toHaveLength(0);

      analytics.setEnabled(true);
      analytics.track('event2');
      expect(analytics.getEvents()).toHaveLength(1);
    });
  });

  describe('initAnalytics', () => {
    it('should track app initialization', () => {
      initAnalytics();

      const events = analytics.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0]?.name).toBe('app_initialized');
      expect(events[0]?.properties?.environment).toBeDefined();
    });
  });

  describe('helper functions', () => {
    it('trackTokenView should track token view', () => {
      trackTokenView('BTC', 'solana');

      const events = analytics.getEvents();
      expect(events[0]?.name).toBe('token_viewed');
      expect(events[0]?.properties).toEqual({ symbol: 'BTC', chain: 'solana' });
    });

    it('trackTokenFilter should track filter', () => {
      trackTokenFilter('search', 'BTC');

      const events = analytics.getEvents();
      expect(events[0]?.name).toBe('token_filtered');
      expect(events[0]?.properties).toEqual({ filterType: 'search', value: 'BTC' });
    });

    it('trackTokenSelected should track selection', () => {
      trackTokenSelected('ETH', 'bsc');

      const events = analytics.getEvents();
      expect(events[0]?.name).toBe('token_selected');
      expect(events[0]?.properties).toEqual({ symbol: 'ETH', chain: 'bsc' });
    });

    it('trackLanguageChange should track language change', () => {
      trackLanguageChange('ru');

      const events = analytics.getEvents();
      expect(events[0]?.name).toBe('language_changed');
      expect(events[0]?.properties).toEqual({ language: 'ru' });
    });

    it('trackThemeChange should track theme change', () => {
      trackThemeChange('dark');

      const events = analytics.getEvents();
      expect(events[0]?.name).toBe('theme_changed');
      expect(events[0]?.properties).toEqual({ theme: 'dark' });
    });
  });
});
