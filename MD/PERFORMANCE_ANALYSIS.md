# ⚡ Анализ производительности

## Обзор

Документ описывает настройку мониторинга производительности и performance budgets для Shark Spread Tracker.

---

## 📊 Web Vitals

### Настроенные метрики

- **CLS (Cumulative Layout Shift)** - стабильность визуального контента
- **FCP (First Contentful Paint)** - время до первого контента
- **LCP (Largest Contentful Paint)** - время до самого большого контента
- **TTFB (Time to First Byte)** - время до первого байта
- **INP (Interaction to Next Paint)** - время отклика на взаимодействие

### Целевые значения

- **FCP:** < 2000ms
- **LCP:** < 2500ms
- **CLS:** < 0.1
- **TTFB:** < 800ms
- **INP:** < 200ms

---

## 🎯 Performance Budgets

### Ресурсы

**Размеры (KB):**
- Scripts: < 500 KB (gzipped)
- Stylesheets: < 100 KB (gzipped)
- Images: < 500 KB (total)
- Fonts: < 100 KB (total)
- Document: < 50 KB
- Total: < 1000 KB (gzipped)

**Количество:**
- Scripts: < 10 файлов
- Stylesheets: < 5 файлов
- Images: < 20 файлов
- Fonts: < 5 файлов
- Total: < 50 файлов

### Время загрузки

- **Interactive:** < 3500ms
- **First Meaningful Paint:** < 2000ms
- **Largest Contentful Paint:** < 2500ms
- **Total Blocking Time:** < 300ms
- **Cumulative Layout Shift:** < 0.1

---

## 🔍 Lighthouse CI

### Настройка

Lighthouse CI настроен для автоматической проверки производительности:

```json
{
  "ci": {
    "assert": {
      "assertions": {
        "categories:performance": ["error", {"minScore": 0.9}],
        "categories:accessibility": ["error", {"minScore": 0.9}],
        "categories:best-practices": ["error", {"minScore": 0.9}],
        "categories:seo": ["error", {"minScore": 0.9}]
      }
    }
  }
}
```

### Запуск

```bash
# Локально
npm run build
npm run preview
npx @lhci/cli autorun

# В CI/CD
# Автоматически запускается при PR и push в main
```

---

## 📈 Мониторинг

### Vercel Analytics

Vercel автоматически отслеживает:
- Web Vitals метрики
- Real User Monitoring (RUM)
- Performance insights

### Sentry Performance

Sentry отслеживает:
- Transaction traces
- Performance bottlenecks
- Slow API calls

---

## 🚀 Оптимизации

### Реализованные

1. **Code Splitting**
   - Vendor библиотеки разделены на чанки
   - Lazy loading для страниц

2. **Кэширование**
   - React Query кэш (30 сек staleTime)
   - Static assets кэширование (1 год)

3. **Bundle Size**
   - Оптимизирован до ~250 KB gzipped
   - Code splitting для уменьшения initial load

4. **Images**
   - Используются оптимизированные форматы
   - Lazy loading для изображений

### Рекомендации

1. **Оптимизация изображений**
   - Использовать WebP формат
   - Добавить srcset для responsive images

2. **Font Loading**
   - Использовать font-display: swap
   - Preload критичные шрифты

3. **Service Worker**
   - Добавить для offline режима
   - Кэширование критичных ресурсов

---

## 📊 Текущие показатели

### Bundle Size

- **Total:** ~250 KB gzipped ✅
- **React Vendor:** 45.57 KB
- **Chart Vendor:** 107.76 KB
- **Index:** 24.65 KB

### Performance

- **Build Time:** ~3 секунды ✅
- **Lighthouse Score:** > 90 (цель) ✅

---

## 🔧 Настройка

### Performance Budgets

Файл `performance-budget.json` определяет лимиты для:
- Размеров ресурсов
- Количества ресурсов
- Времени загрузки

### Lighthouse CI

Файл `.lighthouserc.json` определяет:
- URL для проверки
- Assertions (минимальные scores)
- Количество runs

---

## 📚 Дополнительные ресурсы

- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [Performance Budgets](https://web.dev/performance-budgets-101/)

---

**Последнее обновление:** 2024-12-20

