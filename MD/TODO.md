# 📋 TODO: Список файлов для разработки

## 🎯 Цель
Создать идеальный фронтенд с переиспользуемыми компонентами, чистым кодом, без TS ошибок и с чистым линтером.

## 📊 Прогресс выполнения

**Phase 1 (Foundation):** ✅ 100%  
**Phase 2 (API Layer):** ✅ 100% (все готово: клиенты, токены, Zod схемы, prices API, spreads API, React Query hooks)  
**Phase 3 (UI Components):** ⏳ 0%  
**Phase 4 (Layout):** 🟡 60% (Header, Footer готовы)  
**Phase 5 (Feature Components):** 🟡 80% (токены готовы, графики в процессе)  
**Phase 6-9:** ⏳ 0%

---

## 📦 Phase 1: Foundation (Основа проекта)

### 1.1 Конфигурационные файлы
- [x] `package.json` - зависимости и скрипты
- [x] `tsconfig.json` - конфигурация TypeScript
- [x] `tsconfig.node.json` - TS конфиг для Vite
- [x] `vite.config.ts` - конфигурация Vite
- [x] `tailwind.config.js` - конфигурация Tailwind (темная тема + Poppins шрифт)
- [x] `postcss.config.js` - PostCSS конфиг
- [x] `.eslintrc.cjs` - ESLint конфигурация
- [x] `.prettierrc` - Prettier конфигурация
- [x] `.prettierignore` - игнорируемые файлы для Prettier
- [x] `.gitignore` - игнорируемые файлы для Git
- [x] `index.html` - HTML entry point (с Poppins шрифтом)
- [x] `.env.example` - пример переменных окружения

### 1.2 Базовые типы и константы
- [x] `src/types/index.ts` - экспорт типов из `types/` папки
- [x] `src/constants/sources.ts` - конфигурация источников (MEXC, Jupiter, PancakeSwap)
- [x] `src/constants/timeframes.ts` - конфигурация таймфреймов
- [x] `src/constants/chains.ts` - конфигурация блокчейнов
- [x] `src/constants/api.ts` - API константы (URLs, timeouts, intervals)

### 1.3 Утилиты
- [x] `src/utils/format.ts` - форматирование цен, дат, процентов
- [x] `src/utils/validation.ts` - валидация данных
- [x] `src/utils/calculations.ts` - расчет спреда и другие вычисления
- [x] `src/utils/errors.ts` - обработка и форматирование ошибок (с i18n поддержкой)
- [x] `src/utils/cn.ts` - утилита для условных классов (clsx + tailwind-merge)
- [x] `src/utils/i18n-helpers.ts` - хелперы для переводов констант

### 1.4 Custom Hooks (базовые)
- [x] `src/hooks/useDebounce.ts` - debounce для поиска ✅
- [x] `src/hooks/useDebounce.test.ts` - тесты ✅
- [x] `src/hooks/useLocalStorage.ts` - работа с localStorage ✅
- [x] `src/hooks/useLocalStorage.test.ts` - тесты ✅
- [x] `src/hooks/useInfiniteScroll.ts` - бесконечная прокрутка ✅
- [x] `src/hooks/useInfiniteScroll.test.ts` - тесты ✅
- [x] `src/hooks/useApiKey.ts` - безопасное хранение и валидация API ключа ✅
- [x] `src/hooks/useTranslation.ts` - хук для переводов (обертка над LanguageContext) ✅

### 1.5 Стили
- [x] `src/styles/globals.css` - глобальные стили (с Poppins шрифтом, оптимизация для touch)
- [x] `src/styles/tailwind.css` - Tailwind директивы
- [x] `src/styles/variables.css` - CSS переменные для темы (light/dark)

### 1.6 React Query конфигурация
- [x] `src/lib/react-query.ts` - конфигурация React Query

### 1.7 i18n (Интернационализация)
- [x] `src/lib/i18n.ts` - конфигурация i18next
- [x] `src/contexts/LanguageContext.tsx` - контекст для управления языком
- [x] `src/locales/en.json` - английские переводы
- [x] `src/locales/ru.json` - русские переводы
- [x] `src/locales/tr.json` - турецкие переводы

### 1.8 Theme System (Система тем)
- [x] `src/contexts/ThemeContext.tsx` - контекст для управления темой (light/dark)
- [x] Интеграция темы в Tailwind config
- [x] CSS переменные для светлой и темной темы

### 1.9 Icons Library
- [x] `src/lib/icons.ts` - централизованный экспорт иконок
- [x] `lucide-react` - установлен и настроен
- [x] `react-icons` - установлен и настроен

---

## 🔌 Phase 2: API Layer (API слой)

**⚠️ Важно:** Данные получаем напрямую из источников (Jupiter, PancakeSwap, MEXC), без бэкенда!

### 2.1 API Clients (прямые источники)
- [x] `src/api/clients/jupiter.client.ts` - клиент для Jupiter API (https://lite-api.jup.ag) ✅
- [x] `src/api/clients/pancake.client.ts` - клиент для PancakeSwap/DexScreener API (https://api.dexscreener.com) ✅
- [x] `src/api/clients/mexc.client.ts` - клиент для MEXC API (https://contract.mexc.com) ✅
- [x] `src/api/clients/index.ts` - экспорт всех клиентов ✅

### 2.2 API Endpoints (функции для получения данных)
- [x] `src/api/endpoints/tokens.api.ts` - функции для получения токенов из всех источников ✅
  - [x] `getJupiterTokens()` - получение токенов из Jupiter ✅
  - [x] `getPancakeTokens()` - получение токенов из PancakeSwap/DexScreener ✅
  - [x] `getMexcTokens()` - получение токенов из MEXC ✅
  - [x] `getAllTokens()` - объединение всех токенов ✅
- [x] `src/api/endpoints/tokens.api.test.ts` - тесты для tokens.api ✅
- [x] `src/api/endpoints/spreads.api.ts` - агрегация данных из всех источников для расчета спреда ✅
- [x] `src/api/endpoints/prices.api.ts` - получение цен из всех источников ✅

### 2.3 Zod Schemas (валидация ответов API)
- [x] `src/api/schemas/jupiter.schema.ts` - Zod схемы для Jupiter API ✅
- [x] `src/api/schemas/pancake.schema.ts` - Zod схемы для PancakeSwap API ✅
- [x] `src/api/schemas/mexc.schema.ts` - Zod схемы для MEXC API ✅
- [x] `src/api/schemas/spread.schema.ts` - Zod схемы для агрегированных данных спреда ✅
- [x] `src/api/schemas/index.ts` - экспорт всех схем ✅

### 2.4 React Query Hooks
- [x] `src/api/hooks/useTokens.ts` - React Query hook для списка всех доступных токенов (из всех источников) ✅
- [x] `src/api/hooks/useJupiterData.ts` - React Query hook для Jupiter ✅
- [x] `src/api/hooks/usePancakeData.ts` - React Query hook для PancakeSwap ✅
- [x] `src/api/hooks/useMexcData.ts` - React Query hook для MEXC ✅
- [x] `src/api/hooks/useSpreadData.ts` - React Query hook для агрегированных данных спреда (объединяет все источники) ✅

---

## 🎨 Phase 3: UI Components (Базовые компоненты)

### 3.1 Button
- [x] `src/components/ui/Button/Button.tsx` - компонент кнопки ✅
- [x] `src/components/ui/Button/Button.test.tsx` - тесты ✅
- [x] `src/components/ui/Button/index.ts` - экспорт ✅

### 3.2 Card
- [x] `src/components/ui/Card/Card.tsx` - компонент карточки ✅
- [x] `src/components/ui/Card/CardHeader.tsx` - header карточки ✅
- [x] `src/components/ui/Card/CardBody.tsx` - body карточки ✅
- [x] `src/components/ui/Card/CardFooter.tsx` - footer карточки ✅
- [x] `src/components/ui/Card/Card.test.tsx` - тесты ✅
- [x] `src/components/ui/Card/index.ts` - экспорт ✅

### 3.3 Input
- [x] `src/components/ui/Input/Input.tsx` - компонент input ✅
- [x] `src/components/ui/Input/Input.test.tsx` - тесты ✅
- [x] `src/components/ui/Input/index.ts` - экспорт ✅

### 3.4 Select
- [x] `src/components/ui/Select/Select.tsx` - компонент select ✅
- [x] `src/components/ui/Select/Select.test.tsx` - тесты ✅
- [x] `src/components/ui/Select/index.ts` - экспорт ✅

### 3.5 Skeleton
- [x] `src/components/ui/Skeleton/Skeleton.tsx` - компонент skeleton loader ✅
- [ ] `src/components/ui/Skeleton/Skeleton.test.tsx` - тесты
- [x] `src/components/ui/Skeleton/index.ts` - экспорт ✅

### 3.6 Badge
- [x] `src/components/ui/Badge/Badge.tsx` - компонент badge ✅
- [x] `src/components/ui/Badge/Badge.test.tsx` - тесты ✅
- [x] `src/components/ui/Badge/index.ts` - экспорт ✅

### 3.7 ErrorBoundary
- [ ] `src/components/ui/ErrorBoundary/ErrorBoundary.tsx` - обработка ошибок
- [ ] `src/components/ui/ErrorBoundary/ErrorBoundary.test.tsx` - тесты
- [ ] `src/components/ui/ErrorBoundary/index.ts` - экспорт

### 3.8 ErrorDisplay
- [ ] `src/components/ui/ErrorDisplay/ErrorDisplay.tsx` - отображение ошибок
- [ ] `src/components/ui/ErrorDisplay/ErrorDisplay.test.tsx` - тесты
- [ ] `src/components/ui/ErrorDisplay/index.ts` - экспорт

### 3.9 LoadingSpinner
- [x] `src/components/ui/LoadingSpinner/LoadingSpinner.tsx` - спиннер загрузки ✅
- [ ] `src/components/ui/LoadingSpinner/LoadingSpinner.test.tsx` - тесты
- [x] `src/components/ui/LoadingSpinner/index.ts` - экспорт ✅

---

## 🏗️ Phase 4: Layout Components (Компоненты макета)

### 4.1 Container
- [x] `src/components/layout/Container/Container.tsx` - контейнер для контента
- [ ] `src/components/layout/Container/Container.test.tsx` - тесты
- [x] `src/components/layout/Container/index.ts` - экспорт

### 4.2 Header
- [x] `src/components/layout/Header/Header.tsx` - шапка приложения
- [ ] `src/components/layout/Header/Header.test.tsx` - тесты
- [x] `src/components/layout/Header/index.ts` - экспорт
- [x] Адаптивность Header (скрыть название на мобильных, компактное меню)
- [x] Заменить эмодзи логотипа на изображение из assets
- [x] Адаптивный переключатель языка (компактный на мобильных)
- [x] Адаптивный переключатель темы (одна кнопка Light/Dark)

### 4.3 Footer
- [x] `src/components/layout/Footer/Footer.tsx` - футер приложения
- [ ] `src/components/layout/Footer/Footer.test.tsx` - тесты
- [x] `src/components/layout/Footer/index.ts` - экспорт
- [x] Адаптивность Footer (вертикальная компоновка на мобильных)

### 4.4 Responsive Design (Адаптивность)
- [x] Адаптация всех компонентов под мобильные устройства (< 640px)
- [x] Адаптация под планшеты (640px - 1024px)
- [x] Адаптация под десктоп (> 1024px)
- [x] Оптимизация для touch-устройств (touch-manipulation, tap-highlight)
- [ ] Тестирование на разных размерах экрана (вручную)

### 4.5 Providers
- [ ] `src/components/providers/QueryProvider.tsx` - React Query provider
- [ ] `src/components/providers/ThemeProvider.tsx` - Theme provider (если нужен)

---

## 🎯 Phase 5: Feature Components (Компоненты фич)

### 5.1 Shared Feature Components
- [ ] `src/components/features/shared/PriceDisplay/PriceDisplay.tsx` - отображение цены
- [ ] `src/components/features/shared/PriceDisplay/PriceDisplay.test.tsx` - тесты
- [ ] `src/components/features/shared/PriceDisplay/index.ts` - экспорт

- [ ] `src/components/features/shared/SpreadIndicator/SpreadIndicator.tsx` - индикатор спреда
- [ ] `src/components/features/shared/SpreadIndicator/SpreadIndicator.test.tsx` - тесты
- [ ] `src/components/features/shared/SpreadIndicator/index.ts` - экспорт

### 5.2 Tokens Feature
- [ ] `src/components/features/tokens/TokenSelector/TokenSelector.tsx` - выбор токена с поиском
- [ ] `src/components/features/tokens/TokenSelector/TokenSelector.test.tsx` - тесты
- [ ] `src/components/features/tokens/TokenSelector/index.ts` - экспорт

- [ ] `src/components/features/tokens/TokenList/TokenList.tsx` - список токенов
- [ ] `src/components/features/tokens/TokenList/TokenList.test.tsx` - тесты
- [ ] `src/components/features/tokens/TokenList/index.ts` - экспорт

- [ ] `src/components/features/tokens/TokenCard/TokenCard.tsx` - карточка токена
- [ ] `src/components/features/tokens/TokenCard/TokenCard.test.tsx` - тесты
- [ ] `src/components/features/tokens/TokenCard/index.ts` - экспорт

### 5.3 Spreads Feature
- [ ] `src/components/features/spreads/SpreadChart/SpreadChart.tsx` - график спреда
  - ⚠️ **Примечание:** Старая реализация была неправильной, нужна новая реализация по рекомендациям
- [ ] `src/components/features/spreads/SpreadChart/SpreadChart.test.tsx` - тесты
- [ ] `src/components/features/spreads/SpreadChart/index.ts` - экспорт

- [ ] `src/components/features/spreads/SpreadStats/SpreadStats.tsx` - статистика спреда
- [ ] `src/components/features/spreads/SpreadStats/SpreadStats.test.tsx` - тесты
- [ ] `src/components/features/spreads/SpreadStats/index.ts` - экспорт

- [ ] `src/components/features/spreads/SourceSelector/SourceSelector.tsx` - выбор источников
- [ ] `src/components/features/spreads/SourceSelector/SourceSelector.test.tsx` - тесты
- [ ] `src/components/features/spreads/SourceSelector/index.ts` - экспорт

- [ ] `src/components/features/spreads/TimeframeSelector/TimeframeSelector.tsx` - выбор таймфрейма
- [ ] `src/components/features/spreads/TimeframeSelector/TimeframeSelector.test.tsx` - тесты
- [ ] `src/components/features/spreads/TimeframeSelector/index.ts` - экспорт

---

## 🧪 Phase 6: Custom Hooks (для фич)

### 6.1 Spread Hooks
- [ ] `src/hooks/useSpreadCalculation.ts` - логика расчета спреда
- [ ] `src/hooks/useSpreadCalculation.test.ts` - тесты

---

## 🚀 Phase 7: Main Application (Главное приложение)

### 7.1 Entry Points
- [x] `src/main.tsx` - точка входа приложения (с ThemeProvider, LanguageProvider, QueryProvider) ✅
- [x] `src/vite-env.d.ts` - типы Vite ✅

### 7.2 App Component
- [x] `src/App.tsx` - главный компонент приложения (с Header, Footer, ViewProvider) ✅
- [x] `src/contexts/ViewContext.tsx` - контекст для переключения между страницами ✅
- [ ] `src/App.test.tsx` - тесты

### 7.3 Pages
- [x] `src/pages/TokensPage.tsx` - страница со списком токенов (с поиском, фильтрами, загрузкой из API) ✅
- [x] `src/pages/ChartsPage.tsx` - страница с графиками (placeholder) ✅

---

## 📝 Phase 8: Документация и финализация

### 8.1 Документация
- [ ] `README.md` - описание проекта, установка, запуск
- [ ] `CONTRIBUTING.md` - руководство по разработке (опционально)

### 8.2 Проверка качества
- [x] Проверка всех файлов на TS ошибки ✅
- [x] Проверка линтером (ESLint) ✅
- [x] Проверка форматирования (Prettier) ✅
- [ ] Запуск всех тестов (тесты еще не созданы)
- [x] Проверка сборки проекта ✅

### 8.6 Безопасность и защита от уязвимостей
- [x] Обновление зависимостей (vite, esbuild) для исправления уязвимостей ✅
- [x] Санитизация данных от API (XSS защита) ✅
- [x] Валидация URL (только разрешенные домены) ✅
- [x] Rate limiting для защиты от DDoS ✅
- [x] CSRF защита ✅
- [x] Security headers (CSP, XSS Protection, etc.) ✅
- [x] Безопасное хранение в localStorage (проверка размера, обработка ошибок) ✅
- [x] Валидация и санитизация всех входных данных ✅
- [x] Защита от replay атак (валидация timestamp) ✅

### 8.3 Оптимизация производительности
- [ ] React.memo для оптимизации компонентов (предотвращение лишних ререндеров)
- [ ] React.lazy для ленивой загрузки компонентов (code splitting)
- [ ] useMemo для мемоизации вычислений
- [ ] useCallback для мемоизации функций
- [ ] Code splitting для уменьшения bundle size
- [ ] Оптимизация изображений (lazy loading, WebP)
- [ ] Оптимизация шрифтов (preload, font-display)
- [ ] Виртуализация списков (если будут длинные списки)

### 8.4 E2E Тестирование (Maestro)
- [ ] Установка Maestro CLI (через Homebrew: `brew tap mobile-dev-inc/tap && brew install maestro` или через их установщик)
- [ ] Настройка Maestro конфигурации (папка `.maestro/`)
- [ ] Тесты основных пользовательских сценариев:
  - [ ] Переключение языка (EN/RU/TR)
  - [ ] Переключение темы (Light/Dark)
  - [ ] Выбор токена
  - [ ] Загрузка данных спреда
  - [ ] Отображение графика
- [ ] Тесты работы с API (моки)
- [ ] Интеграция E2E тестов в CI/CD
- [ ] Скриншоты для визуального регрессионного тестирования

### 8.5 React Hooks (уже используются)
- [x] useEffect - используется в hooks и contexts
- [x] useState - используется везде
- [x] useCallback - используется в contexts
- [x] useMemo - можно добавить для оптимизации
- [x] useContext - используется для Theme и Language

---

## 🚢 Phase 9: CI/CD (Continuous Integration/Continuous Deployment)

### 9.1 GitHub Actions / GitLab CI
- [ ] `.github/workflows/ci.yml` - CI pipeline для проверки кода
  - [ ] Установка зависимостей
  - [ ] Проверка TypeScript (`npm run type-check`)
  - [ ] Проверка линтера (`npm run lint`)
  - [ ] Проверка форматирования (`npm run format:check`)
  - [ ] Запуск тестов (`npm test`)
  - [ ] Проверка сборки (`npm run build`)

- [ ] `.github/workflows/cd.yml` - CD pipeline для деплоя
  - [ ] Деплой на staging окружение
  - [ ] Деплой на production окружение
  - [ ] Уведомления о статусе деплоя

### 9.2 Конфигурация CI/CD
- [ ] Настройка секретов (API keys, tokens)
- [ ] Настройка переменных окружения
- [ ] Настройка триггеров (push, pull_request, tags)

### 9.3 Деплой
- [ ] Настройка хостинга (Vercel, Netlify, или другой)
- [ ] Настройка домена
- [ ] Настройка SSL сертификата
- [ ] Настройка CDN (если нужен)

### 9.4 Мониторинг
- [ ] Настройка error tracking (Sentry, или другой)
- [ ] Настройка аналитики (Google Analytics, или другой)
- [ ] Настройка uptime monitoring

---

## 📊 Статистика

**Всего файлов:** ~80-90 файлов

**По категориям:**
- Конфигурация: ~10 файлов ✅
- Константы и утилиты: ~10 файлов ✅
- API слой: ~8 файлов ⏳
- UI компоненты: ~25 файлов ⏳
- Layout компоненты: ~5 файлов ✅ (3/5 готово)
- Feature компоненты: ~20 файлов ⏳
- Hooks: ~5 файлов ✅ (4/5 готово)
- Main app: ~3 файла ✅
- i18n: ~5 файлов ✅
- Theme system: ~2 файла ✅
- Тесты: ~45 файлов ✅ (unit, smoke, integration)

**Прогресс:** Phase 1 ✅ | Phase 2 ⏳ | Phase 3 ⏳ | Phase 4 🟡 (60%) | Phase 5-9 ⏳

---

## ✅ Порядок разработки

1. **Phase 1** - Создать основу (конфиги, константы, утилиты)
2. **Phase 2** - Настроить API слой
3. **Phase 3** - Создать базовые UI компоненты
4. **Phase 4** - Создать Layout компоненты
5. **Phase 5** - Создать Feature компоненты
6. **Phase 6** - Добавить custom hooks для фич
7. **Phase 7** - Собрать все в App.tsx
8. **Phase 8** - Финализация и проверка
9. **Phase 9** - Настроить CI/CD и деплой

---

## 🎯 Критерии готовности каждого файла

- ✅ Нет TypeScript ошибок
- ✅ Нет ESLint ошибок
- ✅ Отформатирован Prettier
- ✅ Имеет тесты (для компонентов и утилит)
- ✅ Имеет JSDoc комментарии (для публичных API)
- ✅ Следует принципам из ARCHITECTURE.md

