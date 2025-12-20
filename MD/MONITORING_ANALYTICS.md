# 📊 Мониторинг и аналитика

## Обзор

Документ описывает настройку мониторинга и аналитики для Shark Spread Tracker.

---

## 🔍 Sentry (Error Tracking)

### Настройка

Sentry настроен для отслеживания ошибок в production:

```typescript
// src/lib/sentry.ts
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  // Performance Monitoring
  tracesSampleRate: 0.1, // 10% в production
  // Session Replay
  replaysSessionSampleRate: 0.1, // 10% в production
  replaysOnErrorSampleRate: 1.0, // 100% для ошибок
});
```

### Переменные окружения

```bash
VITE_SENTRY_DSN=your-sentry-dsn
```

### Функции

- `captureError(error, context)` - отправить ошибку
- `captureMessage(message, level)` - отправить сообщение
- `setUserContext(user)` - установить контекст пользователя
- `clearUserContext()` - очистить контекст пользователя

### Использование

```typescript
import { captureError } from '@/lib/sentry';

try {
  // код
} catch (error) {
  captureError(error, { component: 'MyComponent' });
}
```

---

## 📈 Analytics

### Настройка

Простая аналитика для отслеживания событий:

```typescript
import { analytics } from '@/lib/analytics';

analytics.track('event_name', { property: 'value' });
analytics.pageView('page_name');
```

### События

- `app_initialized` - инициализация приложения
- `token_viewed` - просмотр токена
- `token_filtered` - фильтрация токенов
- `token_selected` - выбор токена
- `language_changed` - смена языка
- `theme_changed` - смена темы
- `web_vital` - метрики Web Vitals

### Включение

```bash
VITE_ENABLE_ANALYTICS=true
```

---

## ⚡ Web Vitals

### Настройка

Мониторинг производительности через Web Vitals:

```typescript
import { initWebVitals } from '@/lib/web-vitals';

initWebVitals(); // Только в production
```

### Отслеживаемые метрики

- **CLS (Cumulative Layout Shift)** - стабильность визуального контента
- **FCP (First Contentful Paint)** - время до первого контента
- **LCP (Largest Contentful Paint)** - время до самого большого контента
- **TTFB (Time to First Byte)** - время до первого байта
- **INP (Interaction to Next Paint)** - время отклика на взаимодействие (заменяет FID)

### Отправка данных

Метрики автоматически отправляются в:
- Sentry (для мониторинга)
- Analytics (для статистики)

---

## 🚨 Алерты

### Sentry Alerts

Настройка алертов в Sentry Dashboard:

1. Перейдите в **Settings → Alerts**
2. Создайте правило для критических ошибок:
   - Условие: Error rate > 5%
   - Действие: Email/Slack уведомление

### Рекомендуемые алерты

- **Критические ошибки:** Error rate > 5%
- **Производительность:** P95 latency > 2s
- **Доступность:** Uptime < 99%

---

## 📊 Dashboard

### Sentry Dashboard

**Метрики:**
- Error rate
- Error count
- Performance metrics
- User sessions

**Фильтры:**
- По окружению (production, staging)
- По времени
- По типу ошибки

### Analytics Dashboard

**События:**
- Page views
- User interactions
- Web Vitals metrics

---

## 🔧 Настройка для production

### 1. Sentry

```bash
# .env.production
VITE_SENTRY_DSN=https://your-dsn@sentry.io/project-id
```

### 2. Analytics

```bash
# .env.production
VITE_ENABLE_ANALYTICS=true
```

### 3. Web Vitals

Автоматически включается в production (через `import.meta.env.PROD`)

---

## 📝 Best Practices

### Error Tracking

1. **Всегда логируйте контекст:**
```typescript
captureError(error, {
  component: 'MyComponent',
  action: 'fetchData',
  userId: user.id,
});
```

2. **Не логируйте чувствительные данные:**
```typescript
// ❌ Плохо
captureError(error, { apiKey: 'secret' });

// ✅ Хорошо
captureError(error, { hasApiKey: true });
```

3. **Используйте правильные уровни:**
```typescript
captureMessage('Info message', 'info');
captureMessage('Warning message', 'warning');
captureMessage('Error message', 'error');
```

### Analytics

1. **Используйте осмысленные имена событий:**
```typescript
// ❌ Плохо
analytics.track('click');

// ✅ Хорошо
analytics.track('token_card_clicked', { token: 'BTC' });
```

2. **Не отслеживайте PII (Personally Identifiable Information):**
```typescript
// ❌ Плохо
analytics.track('user_action', { email: user.email });

// ✅ Хорошо
analytics.track('user_action', { userId: user.id });
```

---

## 📚 Дополнительные ресурсы

- [Sentry Documentation](https://docs.sentry.io/)
- [Web Vitals](https://web.dev/vitals/)
- [Google Analytics](https://analytics.google.com/)

---

**Последнее обновление:** 2024-12-20

