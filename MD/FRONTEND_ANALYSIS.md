# 🦈 Shark Frontend - Полный анализ и рекомендации

> **Дата анализа:** Декабрь 2024  
> **Цель:** Понимание логики, выявление проблем, рекомендации для нового проекта

---

## 📊 Как работает логика загрузки данных по API

### 1. Сервис API (`src/services/api.ts`)

```
┌─────────────────────────────────────────────────────────────┐
│  API Service                                                 │
├─────────────────────────────────────────────────────────────┤
│  Base URL: VITE_API_URL (env) или '/api' (default)          │
│  API Key: берется из URL параметра ?api_key=...             │
│  HTTP Client: axios                                          │
└─────────────────────────────────────────────────────────────┘
```

**Эндпоинты:**
| Метод | Эндпоинт | Параметры | Описание |
|-------|----------|-----------|----------|
| GET | `/tokens` | `api_key` | Список доступных токенов |
| GET | `/spread/{symbol}` | `api_key`, `timeframe`, `limit` | Данные спреда для токена |

**Механизм работы:**
1. `axios.create()` создает инстанс с базовым URL
2. Интерцептор автоматически добавляет `api_key` ко всем запросам
3. API ключ извлекается из `window.location.search`

### 2. Поток загрузки данных (`App.tsx`)

```
┌──────────────────────────────────────────────────────────────────────┐
│                         FLOW ЗАГРУЗКИ                                 │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│   [Монтирование App]                                                  │
│         │                                                             │
│         ▼                                                             │
│   useEffect(() => loadTokens())  ──────────►  GET /api/tokens        │
│         │                                                             │
│         ▼                                                             │
│   Автовыбор первого токена                                           │
│         │                                                             │
│         ▼                                                             │
│   loadSpreadData(symbol, timeframe)  ────►  GET /api/spread/{symbol} │
│         │                                                             │
│         ▼                                                             │
│   setSpreadData(response)                                             │
│         │                                                             │
│         ▼                                                             │
│   useEffect для chain ──────►  Автовыбор source1/source2             │
│         │                      (solana → jupiter/mexc)               │
│         │                      (bsc → pancakeswap/mexc)              │
│         ▼                                                             │
│   [Auto-refresh каждые 10 сек если включен]                          │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

### 3. Структура ответа API

```typescript
// GET /tokens
{ tokens: Token[] }  // Token = { symbol: string, chain: 'solana' | 'bsc' }

// GET /spread/{symbol}
{
  symbol: string,
  chain: 'solana' | 'bsc',
  history: SpreadDataPoint[],  // Исторические данные
  current: CurrentData | null, // Текущие цены
  sources: {                   // Доступность источников
    mexc: boolean,
    jupiter: boolean,
    pancakeswap: boolean
  }
}
```

---

## 📈 Формула расчета процента спреда

### Основная формула

```
Spread % = ((price_target - price_source) / price_source) × 100
```

### Где используется

**1. В `StatsPanel.tsx` (строки 70-78):**
```typescript
const calculateSpread = (fromSource: SourceType, toSource: SourceType): number | null => {
  const price1 = getPrice(fromSource);  // Цена источника (откуда покупаем)
  const price2 = getPrice(toSource);    // Цена назначения (куда продаем)
  
  if (!price1 || !price2) return null;
  
  // Spread = ((price2 - price1) / price1) * 100
  return ((price2 - price1) / price1) * 100;
};
```

**2. В `SpreadChart.tsx` (строки 74-91):**
```typescript
const processedData = React.useMemo(() => {
  return data.map((point) => {
    const price1 = getSourcePrice(point, source1);
    const price2 = getSourcePrice(point, source2);
    
    let spread = null;
    if (price1 && price2) {
      spread = ((price2 - price1) / price1) * 100;  // Та же формула
    }
    
    return { ...point, source1_price: price1, source2_price: price2, spread };
  });
}, [data, source1, source2]);
```

### Пример расчета

```
Сценарий: MEXC → Jupiter для токена SOL

MEXC цена:     $100.00 (source1 - покупаем тут)
Jupiter цена:  $102.50 (source2 - продаем тут)

Spread = ((102.50 - 100.00) / 100.00) × 100 = +2.5%

Интерпретация: Купив на MEXC и продав на Jupiter, 
можно заработать 2.5% (минус комиссии)
```

### Визуализация в UI

- **Положительный спред (>0)**: зеленый цвет → арбитражная возможность
- **Отрицательный спред (<0)**: красный цвет → невыгодно
- **Нулевой спред (=0)**: серый цвет → нет разницы

---

## 🐛 Выявленные ошибки и проблемы

### 🔴 Критические

| # | Проблема | Файл | Строки | Описание |
|---|----------|------|--------|----------|
| 1 | **API ключ в URL** | `api.ts` | 7-10 | Небезопасно: виден в истории браузера, логах сервера, Referer заголовках |
| 2 | **Race condition** | `App.tsx` | 73-95 | При быстром переключении токенов старые запросы могут перезаписать новые |
| 3 | **Memory leak** | `App.tsx` | 73-95 | Нет отмены запросов при размонтировании или смене токена |

### 🟠 Важные

| # | Проблема | Файл | Строки | Описание |
|---|----------|------|--------|----------|
| 4 | **Неполные зависимости useCallback** | `App.tsx` | 97-107 | `loadSpreadData` не в зависимостях, может вызвать stale closure |
| 5 | **Нет retry логики** | `api.ts` | all | При сбое сети нет повторных попыток |
| 6 | **Нет валидации данных** | `api.ts` | 33-47 | Данные от API используются без runtime проверки |
| 7 | **Дублирование sourceInfo** | Multiple | - | Объект `sourceInfo` определен в 3 файлах отдельно |
| 8 | **Отсутствие кэширования** | `api.ts` | all | Каждый запрос идет на сервер, нет кэша |

### 🟡 Средние

| # | Проблема | Файл | Строки | Описание |
|---|----------|------|--------|----------|
| 9 | **Generic error messages** | `App.tsx` | 67-69, 85-88 | Пользователь не знает причину ошибки |
| 10 | **Жестко прописанные sources** | `types/index.ts` | 6 | Добавление новой биржи требует правок в 5+ местах |
| 11 | **clsx не используется** | `package.json` | 18 | Установлен но не применяется |
| 12 | **Нет loading skeleton** | Components | - | При загрузке просто спиннер, нет скелетонов |
| 13 | **Нет обработки пустого списка токенов** | `App.tsx` | 60-66 | Если API вернет [], UI будет пустым без объяснения |

### 🔵 Незначительные

| # | Проблема | Файл | Описание |
|---|----------|------|----------|
| 14 | **Магические числа** | `App.tsx:32` | `10000` мс для интервала - лучше константа |
| 15 | **Нет throttle/debounce** | `TokenSelector.tsx` | Поиск срабатывает на каждый символ |
| 16 | **Timestamp без учета TZ** | `SpreadChart.tsx:43` | `toLocaleString` без явной timezone |

---

## 🛠 Детальное описание проблем с кодом

### Проблема #1: API ключ в URL

```typescript
// api.ts - ТЕКУЩИЙ КОД (небезопасно)
const getApiKey = (): string | null => {
  const params = new URLSearchParams(window.location.search);
  return params.get('api_key');  // ⚠️ Виден всем
};
```

**Риски:**
- Виден в истории браузера
- Логируется веб-серверами
- Передается в Referer header при переходах
- Может быть перехвачен расширениями браузера

### Проблема #2: Race Condition

```typescript
// App.tsx - ТЕКУЩИЙ КОД
const loadSpreadData = async (symbol: string, tf: TimeframeOption, silent: boolean = false) => {
  // ...
  const data = await api.getSpreadData(symbol, tf);  // ⚠️ Нет отмены предыдущего
  setSpreadData(data);  // Старый ответ может перезаписать новый
};
```

**Сценарий:**
1. Пользователь кликает на SOL → запрос #1 уходит
2. Быстро кликает на ETH → запрос #2 уходит
3. Запрос #2 завершается (ETH данные)
4. Запрос #1 завершается позже (SOL данные) → перезаписывает ETH!

### Проблема #4: Stale Closure

```typescript
// App.tsx - ТЕКУЩИЙ КОД
const handleSelectToken = useCallback((symbol: string) => {
  setSelectedToken(symbol);
  loadSpreadData(symbol, timeframe);  // ⚠️ loadSpreadData не в deps
}, [timeframe]);  // Если loadSpreadData обновится, здесь старая версия
```

### Проблема #7: Дублирование

```typescript
// StatsPanel.tsx
const sourceInfo: Record<SourceType, { label: string; emoji: string; color: string }> = {
  mexc: { label: 'MEXC', emoji: '💱', color: 'text-yellow-400' },
  // ...
};

// SourceSelector.tsx - ТОТ ЖЕ КОД
const sourceInfo: Record<SourceType, { label: string; emoji: string; color: string }> = {
  mexc: { label: 'MEXC', emoji: '💱', color: 'text-yellow-400' },
  // ...
};

// SpreadChart.tsx - ЧАСТИЧНО ТОТ ЖЕ
const sourceInfo: Record<SourceType, { label: string; color: string }> = {
  mexc: { label: 'MEXC', color: '#fbbf24' },
  // ...
};
```

---

## ✅ Рекомендации для нового проекта

### 1. Архитектура API слоя

```typescript
// Рекомендуемая структура
src/
├── api/
│   ├── client.ts          // Axios instance + interceptors
│   ├── endpoints/
│   │   ├── tokens.ts      // Токены API
│   │   └── spreads.ts     // Спреды API
│   ├── hooks/
│   │   ├── useTokens.ts   // React Query hook
│   │   └── useSpreads.ts  // React Query hook
│   └── types.ts           // Все API типы
```

### 2. Безопасное хранение API ключа

```typescript
// Вариант 1: HTTP-only cookie (безопаснее)
// Вариант 2: localStorage с коротким TTL
// Вариант 3: Session-based auth через backend

// НЕ использовать URL параметры для секретов!
```

### 3. Использование React Query / TanStack Query

```typescript
// Решает: кэширование, retry, race conditions, loading states
import { useQuery } from '@tanstack/react-query';

export const useSpreadData = (symbol: string, timeframe: string) => {
  return useQuery({
    queryKey: ['spread', symbol, timeframe],
    queryFn: () => api.getSpreadData(symbol, timeframe),
    staleTime: 5000,        // Кэш на 5 сек
    retry: 3,               // 3 повторные попытки
    refetchInterval: 10000, // Auto-refresh
  });
};
```

### 4. Отмена запросов (AbortController)

```typescript
// При использовании чистого axios
const loadSpreadData = async (symbol: string, signal: AbortSignal) => {
  const data = await api.getSpreadData(symbol, timeframe, { signal });
  if (!signal.aborted) {
    setSpreadData(data);
  }
};

// В useEffect
useEffect(() => {
  const controller = new AbortController();
  loadSpreadData(selectedToken, controller.signal);
  return () => controller.abort();  // Отмена при unmount
}, [selectedToken]);
```

### 5. Runtime валидация с Zod

```typescript
import { z } from 'zod';

const SpreadResponseSchema = z.object({
  symbol: z.string(),
  chain: z.enum(['solana', 'bsc']),
  history: z.array(SpreadDataPointSchema),
  current: CurrentDataSchema.nullable(),
  sources: z.object({
    mexc: z.boolean(),
    jupiter: z.boolean(),
    pancakeswap: z.boolean(),
  }),
});

// В API
const response = await apiClient.get(`/spread/${symbol}`);
return SpreadResponseSchema.parse(response.data);  // Runtime проверка
```

### 6. Централизованные константы

```typescript
// src/constants/sources.ts
export const SOURCES = {
  mexc: { 
    label: 'MEXC', 
    emoji: '💱', 
    colorTailwind: 'text-yellow-400',
    colorHex: '#fbbf24' 
  },
  jupiter: { 
    label: 'Jupiter', 
    emoji: '🪐', 
    colorTailwind: 'text-purple-400',
    colorHex: '#a78bfa' 
  },
  pancakeswap: { 
    label: 'PancakeSwap', 
    emoji: '🥞', 
    colorTailwind: 'text-yellow-400',
    colorHex: '#facc15' 
  },
} as const;

// Использование
import { SOURCES } from '@/constants/sources';
<span className={SOURCES.mexc.colorTailwind}>{SOURCES.mexc.label}</span>
```

### 7. Улучшенная обработка ошибок

```typescript
// Типизированные ошибки
class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
  }
}

// User-friendly сообщения
const getErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    switch (error.statusCode) {
      case 401: return 'Неверный API ключ';
      case 404: return 'Токен не найден';
      case 429: return 'Слишком много запросов';
      case 500: return 'Ошибка сервера, попробуйте позже';
      default: return error.message;
    }
  }
  if (error instanceof Error && error.message.includes('Network')) {
    return 'Проверьте подключение к интернету';
  }
  return 'Произошла неизвестная ошибка';
};
```

### 8. Skeleton Loading

```typescript
// Вместо спиннера - скелетоны формы контента
const StatsSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-6 bg-dark-800 rounded w-1/3" />
    <div className="h-20 bg-dark-800 rounded" />
    <div className="h-20 bg-dark-800 rounded" />
  </div>
);
```

### 9. Расширяемая система источников

```typescript
// Вместо хардкода - конфиг
interface SourceConfig {
  id: string;
  label: string;
  emoji: string;
  color: { tailwind: string; hex: string };
  chains: ('solana' | 'bsc' | 'ethereum')[];
  priceField: string;  // Динамическое поле в API ответе
}

const sourcesConfig: SourceConfig[] = [
  { id: 'mexc', label: 'MEXC', chains: ['solana', 'bsc'], priceField: 'mexc_price', ... },
  { id: 'jupiter', label: 'Jupiter', chains: ['solana'], priceField: 'jupiter_price', ... },
  // Легко добавить новый источник
];
```

### 10. Debounce для поиска

```typescript
import { useDebouncedValue } from '@mantine/hooks';
// или
import { useDebounce } from 'use-debounce';

const [searchTerm, setSearchTerm] = useState('');
const [debouncedSearch] = useDebounce(searchTerm, 300);

const filteredTokens = useMemo(() => {
  return tokens.filter(t => 
    t.symbol.toLowerCase().includes(debouncedSearch.toLowerCase())
  );
}, [tokens, debouncedSearch]);
```

---

## 📦 Рекомендуемый стек для нового проекта

| Текущий | Рекомендуемый | Причина |
|---------|---------------|---------|
| axios | **axios + React Query** | Кэширование, retry, состояния |
| useState для данных | **TanStack Query** | Меньше boilerplate, мощнее |
| - | **Zod** | Runtime валидация |
| - | **React Error Boundary** | Graceful error handling |
| recharts | recharts (оставить) | Хорошая библиотека |
| lucide-react | lucide-react (оставить) | Хороший выбор |
| tailwindcss | tailwindcss (оставить) | Отличный выбор |

---

## 🎯 Checklist для нового проекта

- [ ] Безопасное хранение API ключа (не в URL!)
- [ ] React Query для API запросов
- [ ] AbortController / автоотмена запросов
- [ ] Zod для валидации API ответов
- [ ] Централизованные константы (sources, timeframes)
- [ ] Error boundaries + user-friendly сообщения
- [ ] Skeleton loaders вместо спиннеров
- [ ] Debounce для поиска
- [ ] Конфигурируемая система источников
- [ ] Unit тесты для расчета спреда
- [ ] E2E тесты для основных сценариев

---

## 📝 Заключение

**Что хорошо:**
- Чистая структура компонентов
- TypeScript типизация
- Tailwind CSS настроен правильно
- Recharts хорошо интегрирован
- Responsive дизайн присутствует

**Что нужно улучшить:**
- Безопасность (API ключ)
- Надежность (race conditions, retry)
- Масштабируемость (дублирование, хардкод)
- UX (skeleton loading, error messages)

**Расчет спреда корректен** — формула `((price2 - price1) / price1) × 100` является стандартной для определения процентной разницы цен между источниками.

