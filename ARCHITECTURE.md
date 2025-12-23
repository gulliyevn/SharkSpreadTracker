# Архитектура SharkFront

## Обзор

SharkFront — фронтенд для отслеживания спредов криптовалют между DEX (Jupiter, PancakeSwap) и CEX (MEXC).

## Стек технологий

- **React 18** + TypeScript
- **Vite** — сборка и dev-сервер
- **React Query 5** — кэширование и синхронизация данных
- **Tailwind CSS** — стилизация
- **Recharts** — графики
- **i18next** — интернационализация (EN, RU, TR)
- **Sentry** — мониторинг ошибок
- **Vitest + Playwright** — тестирование

## Структура проекта

```
src/
├── api/                    # Работа с API
│   ├── adapters/           # API-адаптер (единая точка входа)
│   ├── clients/            # HTTP-клиенты (backendClient)
│   ├── hooks/              # React Query хуки
│   ├── mockData/           # Моковые данные для дева
│   └── schemas/            # Zod-схемы валидации
├── components/
│   ├── features/           # Фичи (tokens, spreads, charts)
│   ├── layout/             # Лейаут (Header, Footer)
│   ├── providers/          # Context providers
│   └── ui/                 # UI-компоненты (Modal, Toast, etc.)
├── constants/              # Константы (API_CONFIG, CHAINS, etc.)
├── contexts/               # React контексты (Theme, Language, Toast, View)
├── hooks/                  # Кастомные хуки
├── lib/                    # Библиотеки (react-query, i18n, sentry)
├── locales/                # Переводы (en.json, ru.json, tr.json)
├── pages/                  # Страницы (TokensPage, ChartsPage)
├── styles/                 # Глобальные стили
├── types/                  # TypeScript типы
└── utils/                  # Утилиты (security, validation, logger)
```

## Backend-Only режим

Фронт работает **только через бэкенд** — нет прямых запросов к Jupiter/MEXC/PancakeSwap.

### Эндпоинты бэкенда

| Endpoint | Протокол | Описание |
|----------|----------|----------|
| `/socket/sharkStraight` | WebSocket | Прямой спред (DEX → CEX) |
| `/socket/sharkReverse` | WebSocket | Обратный спред (CEX → DEX) — TODO |

### Конфигурация

```env
VITE_BACKEND_URL=http://your-backend:8080
VITE_WEBSOCKET_URL=ws://your-backend:8080/socket/sharkStraight  # опционально
VITE_SENTRY_DSN=https://...@sentry.io/...  # для production
```

## API-адаптер

`src/api/adapters/api-adapter.ts` — единая точка общения с бэкендом.

```typescript
// Экспортируемые функции
getAllTokens(signal?)        // Все токены со спредами
getAllPrices(token, signal?) // Цены для токена
getSpreadData(token, timeframe?, signal?) // Данные спреда
getSpreadsForTokens(tokens, signal?, maxTokens?) // Спреды для списка
getMexcTradingLimits(symbol, signal?) // Лимиты MEXC
```

## Типы данных

### От бэкенда (raw)

```typescript
interface StraightData {
  token: string;      // "BTC"
  aExchange: string;  // "Jupiter"
  bExchange: string;  // "MEXC"
  priceA: string;     // "50000.00"
  priceB: string;     // "50100.00"
  spread: string;     // "0.2"
  network: string;    // "solana" | "bsc"
  limit: string;      // "all"
}
```

### Нормализованные (frontend)

```typescript
interface SpreadRow {
  token: string;
  chain: 'solana' | 'bsc';
  aExchange: string;
  bExchange: string;
  priceA: number | null;
  priceB: number | null;
  spread: number | null;
  limit: string;
}
```

## React Query

Конфигурация в `src/lib/react-query.ts`:

- **staleTime:** 30 секунд (spreads), 2 минуты (tokens)
- **gcTime:** 10 минут
- **retry:** 3 попытки с exponential backoff
- **refetchOnWindowFocus:** включено

## Контексты

| Контекст | Назначение |
|----------|------------|
| ThemeContext | Тема (light/dark) |
| LanguageContext | Язык (en/ru/tr) |
| ToastContext | Уведомления |
| ViewContext | Вид отображения |

## Безопасность

- **CSP** настроен в `vite.config.security.ts` и `vercel.json`
- **API ключи** хранятся в `sessionStorage` (не localStorage)
- **Sanitization** для строк, URL, чисел в `src/utils/security.ts`
- **Rate limiting** клиентский в `src/utils/security.ts`

## Сборка и деплой

```bash
npm run dev      # Дев-сервер
npm run build    # Сборка production
npm run preview  # Превью production
npm run test     # Unit-тесты
npm run e2e      # E2E-тесты
```

## TODO

Актуальный список задач в `TODO.md`.

