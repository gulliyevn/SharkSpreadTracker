/**
 * Простая аналитика для отслеживания событий
 * Можно заменить на Google Analytics или другой сервис
 */

type AnalyticsEvent = {
  name: string;
  properties?: Record<string, unknown>;
  timestamp?: number;
};

class Analytics {
  private events: AnalyticsEvent[] = [];
  private readonly maxEvents = 100; // Ограничиваем размер для памяти
  private enabled: boolean;

  constructor() {
    // Включаем аналитику только в production или если явно указано
    this.enabled =
      import.meta.env.PROD || import.meta.env.VITE_ENABLE_ANALYTICS === 'true';
  }

  /**
   * Отследить событие
   */
  track(eventName: string, properties?: Record<string, unknown>): void {
    if (!this.enabled) {
      return;
    }

    const event: AnalyticsEvent = {
      name: eventName,
      properties,
      timestamp: Date.now(),
    };

    this.events.push(event);

    // Ограничиваем размер массива
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    // В production можно отправлять на сервер
    // В dev режиме просто логируем
    if (import.meta.env.DEV) {
      console.log('[Analytics]', eventName, properties);
    }

    // Здесь можно добавить отправку в Google Analytics или другой сервис
    // if (window.gtag) {
    //   window.gtag('event', eventName, properties);
    // }
  }

  /**
   * Отследить просмотр страницы
   */
  pageView(pageName: string, properties?: Record<string, unknown>): void {
    this.track('page_view', {
      page: pageName,
      ...properties,
    });
  }

  /**
   * Получить все события (для отладки)
   */
  getEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  /**
   * Очистить события
   */
  clear(): void {
    this.events = [];
  }

  /**
   * Включить/выключить аналитику
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

export const analytics = new Analytics();

/**
 * Инициализация аналитики
 */
export function initAnalytics(): void {
  // Здесь можно инициализировать Google Analytics или другой сервис
  // if (import.meta.env.VITE_GA_ID) {
  //   // Инициализация GA
  // }

  analytics.track('app_initialized', {
    environment: import.meta.env.MODE,
    timestamp: Date.now(),
  });
}

/**
 * Хелперы для отслеживания основных событий
 */
export const trackTokenView = (symbol: string, chain: string): void => {
  analytics.track('token_viewed', { symbol, chain });
};

export const trackTokenFilter = (filterType: string, value: unknown): void => {
  analytics.track('token_filtered', { filterType, value });
};

export const trackTokenSelected = (symbol: string, chain: string): void => {
  analytics.track('token_selected', { symbol, chain });
};

export const trackLanguageChange = (language: string): void => {
  analytics.track('language_changed', { language });
};

export const trackThemeChange = (theme: 'light' | 'dark'): void => {
  analytics.track('theme_changed', { theme });
};
