# 🔄 CI/CD Улучшения

## Обзор

Документ описывает настройку CI/CD pipeline для Shark Spread Tracker.

---

## ✅ Реализованные улучшения

### 1. Bundle Size Checks

Автоматическая проверка размера bundle в CI:

```yaml
- name: Check bundle size
  run: |
    BUNDLE_SIZE=$(du -sb dist | cut -f1)
    BUNDLE_SIZE_MB=$((BUNDLE_SIZE / 1024 / 1024))
    if [ $BUNDLE_SIZE_MB -gt 5 ]; then
      echo "⚠️ Bundle size exceeds 5 MB limit!"
      exit 1
    fi
```

**Лимит:** 5 MB (uncompressed)

### 2. Security Scans

Автоматические security scans:

- **npm audit** - проверка уязвимостей в зависимостях
- **Snyk** - расширенный security scan (опционально)

**Расписание:** Еженедельно + при PR

### 3. Lighthouse CI

Автоматическая проверка производительности:

- Performance score > 90
- Accessibility score > 90
- Best practices score > 90
- SEO score > 90

### 4. Dependabot

Автоматическое обновление зависимостей:

- **Расписание:** Еженедельно
- **Группировка:** Production и development зависимости отдельно
- **Игнорирование:** Major версии критичных пакетов (React, TypeScript)

---

## 📋 Workflows

### CI Workflow (`.github/workflows/ci.yml`)

**Триггеры:**
- Push в main/develop
- Pull requests

**Шаги:**
1. Lint проверка
2. Type check
3. Format check
4. Unit тесты
5. Build
6. Bundle size check
7. E2E тесты

### Performance Workflow (`.github/workflows/performance.yml`)

**Триггеры:**
- Pull requests
- Push в main
- Manual trigger

**Шаги:**
1. Build
2. Start preview server
3. Run Lighthouse CI
4. Upload artifacts

### Security Workflow (`.github/workflows/security.yml`)

**Триггеры:**
- Pull requests
- Push в main
- Еженедельно (воскресенье)
- Manual trigger

**Шаги:**
1. npm audit
2. Snyk scan (если настроен)

### Deploy Workflow (`.github/workflows/deploy.yml`)

**Триггеры:**
- Push в main
- Manual trigger

**Шаги:**
1. Build
2. Deploy to Vercel

---

## 🔧 Настройка

### Dependabot

Файл `.github/dependabot.yml` настраивает:
- Расписание обновлений
- Группировку зависимостей
- Игнорирование major версий

### Lighthouse CI

Файл `.lighthouserc.json` настраивает:
- URL для проверки
- Assertions (минимальные scores)
- Количество runs

### Performance Budgets

Файл `performance-budget.json` определяет:
- Лимиты размеров ресурсов
- Лимиты времени загрузки

---

## 📊 Метрики

### Bundle Size

- **Текущий:** ~250 KB gzipped ✅
- **Лимит:** 5 MB uncompressed ✅
- **Цель:** < 500 KB gzipped ✅

### Test Coverage

- **Текущий:** 83.53%
- **Цель:** 90%+
- **Тесты:** 739 проходят, 0 падают ✅

### Performance

- **Lighthouse Score:** > 90 ✅
- **Build Time:** ~3 секунды ✅

---

## 🚀 Рекомендации

### Для разработчиков

1. **Проверяйте bundle size** перед коммитом:
```bash
npm run build
du -sh dist
```

2. **Обновляйте зависимости** регулярно:
```bash
npm outdated
npm update
```

3. **Проверяйте security** перед деплоем:
```bash
npm audit
```

### Для CI/CD

1. **Мониторьте метрики** в GitHub Actions
2. **Проверяйте alerts** от Dependabot
3. **Реview PRs** от автоматических обновлений

---

## 📚 Дополнительные ресурсы

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)

---

**Последнее обновление:** 2024-12-20

