# 📚 API Документация

## Обзор

Shark Spread Tracker использует прямые вызовы к внешним API (Jupiter, PancakeSwap/DexScreener, MEXC) без промежуточного бэкенда.

**Режим работы:** `direct` (по умолчанию)  
**Прокси:** Используется в dev-режиме для обхода CORS  
**Production:** Прямые вызовы к API

---

## 🔌 Источники данных

### 1. Jupiter API
- **URL:** `https://lite-api.jup.ag` (dev) или `https://api.jup.ag` (production)
- **Блокчейн:** Solana
- **Аутентификация:** Опционально (API ключ через `VITE_JUPITER_API_KEY`)
- **Документация:** https://docs.jup.ag/

### 2. PancakeSwap (DexScreener)
- **URL:** `https://api.dexscreener.com`
- **Блокчейн:** BSC (Binance Smart Chain)
- **Аутентификация:** Не требуется
- **Документация:** https://docs.dexscreener.com/

### 3. MEXC API
- **URL:** `https://api.mexc.com`
- **Блокчейн:** Solana, BSC
- **Аутентификация:** Не требуется для публичных эндпоинтов
- **Документация:** https://mexcdevelop.github.io/apidocs/

---

## 📡 API Endpoints

### Tokens API

#### `getAllTokens(signal?: AbortSignal): Promise<TokenWithData[]>`

Получить все токены из всех источников.

**Параметры:**
- `signal` (опционально): `AbortSignal` для отмены запроса

**Возвращает:**
```typescript
interface TokenWithData extends Token {
  price?: number | null;
  directSpread?: number | null;
  reverseSpread?: number | null;
}

interface Token {
  symbol: string;
  chain: 'solana' | 'bsc';
  address?: string;
}
```

**Пример:**
```typescript
import { getAllTokens } from '@/api/endpoints/tokens.api';

const tokens = await getAllTokens();
console.log(tokens); // [{ symbol: 'BTC', chain: 'solana', ... }, ...]
```

**Ошибки:**
- Возвращает пустой массив при ошибках
- Логирует ошибки в консоль

---

#### `getJupiterTokens(signal?: AbortSignal): Promise<Token[]>`

Получить токены из Jupiter (Solana).

**Параметры:**
- `signal` (опционально): `AbortSignal` для отмены запроса

**Возвращает:**
```typescript
Token[] // Массив токенов Solana
```

**Эндпоинт:**
- `GET /tokens/v2/recent` (Jupiter API)

**Пример:**
```typescript
import { getJupiterTokens } from '@/api/endpoints/tokens.api';

const tokens = await getJupiterTokens();
console.log(tokens); // [{ symbol: 'SOL', chain: 'solana', address: '...' }, ...]
```

---

#### `getPancakeTokens(signal?: AbortSignal): Promise<Token[]>`

Получить токены из PancakeSwap (BSC) через DexScreener API.

**Параметры:**
- `signal` (опционально): `AbortSignal` для отмены запроса

**Возвращает:**
```typescript
Token[] // Массив токенов BSC
```

**Эндпоинт:**
- `GET /latest/dex/search?q={symbol}` (DexScreener API)

**Пример:**
```typescript
import { getPancakeTokens } from '@/api/endpoints/tokens.api';

const tokens = await getPancakeTokens();
console.log(tokens); // [{ symbol: 'BNB', chain: 'bsc', address: '...' }, ...]
```

---

#### `getMexcTokens(signal?: AbortSignal): Promise<Token[]>`

Получить токены из MEXC.

**Параметры:**
- `signal` (опционально): `AbortSignal` для отмены запроса

**Возвращает:**
```typescript
Token[] // Массив токенов (Solana и BSC)
```

**Эндпоинт:**
- `GET /api/v3/exchangeInfo` (MEXC API)

**Пример:**
```typescript
import { getMexcTokens } from '@/api/endpoints/tokens.api';

const tokens = await getMexcTokens();
console.log(tokens); // [{ symbol: 'BTC', chain: 'bsc', ... }, ...]
```

---

### Prices API

#### `getAllPrices(token: Token, signal?: AbortSignal): Promise<AllPrices>`

Получить все цены токена из всех источников.

**Параметры:**
- `token`: `Token` - объект с `symbol` и `chain`
- `signal` (опционально): `AbortSignal` для отмены запроса

**Возвращает:**
```typescript
interface AllPrices {
  symbol: string;
  chain: 'solana' | 'bsc';
  jupiter: TokenPrice | null;
  pancakeswap: TokenPrice | null;
  mexc: TokenPrice | null;
  timestamp: number;
}

interface TokenPrice {
  price: number | null;
  bid?: number | null;
  ask?: number | null;
  timestamp: number;
  source: 'jupiter' | 'pancakeswap' | 'mexc';
}
```

**Пример:**
```typescript
import { getAllPrices } from '@/api/endpoints/prices.api';

const prices = await getAllPrices({ symbol: 'BTC', chain: 'solana' });
console.log(prices.jupiter?.price); // 50000
console.log(prices.mexc?.price); // 50010
```

---

#### `getJupiterPrice(symbol: string, address?: string, signal?: AbortSignal): Promise<TokenPrice | null>`

Получить цену токена из Jupiter.

**Параметры:**
- `symbol`: `string` - символ токена (например, 'SOL')
- `address` (опционально): `string` - адрес токена в Solana (mint address)
- `signal` (опционально): `AbortSignal` для отмены запроса

**Возвращает:**
```typescript
TokenPrice | null
```

**Эндпоинт:**
- `GET /price/v3?ids={address}` (Jupiter API V3)

**Важно:** Требует `address` (mint address) для получения цены.

**Пример:**
```typescript
import { getJupiterPrice } from '@/api/endpoints/prices.api';

const price = await getJupiterPrice('SOL', 'So11111111111111111111111111111111111111112');
console.log(price?.price); // 100.5
```

---

#### `getPancakePrice(symbol: string, signal?: AbortSignal): Promise<TokenPrice | null>`

Получить цену токена из PancakeSwap (DexScreener).

**Параметры:**
- `symbol`: `string` - символ токена (например, 'BNB')
- `signal` (опционально): `AbortSignal` для отмены запроса

**Возвращает:**
```typescript
TokenPrice | null
```

**Эндпоинт:**
- `GET /latest/dex/search?q={symbol}` (DexScreener API)

**Пример:**
```typescript
import { getPancakePrice } from '@/api/endpoints/prices.api';

const price = await getPancakePrice('BNB');
console.log(price?.price); // 300.5
```

---

#### `getMexcPrice(symbol: string, signal?: AbortSignal): Promise<TokenPrice | null>`

Получить цену токена из MEXC.

**Параметры:**
- `symbol`: `string` - символ токена для MEXC (например, 'BTCUSDT')
- `signal` (опционально): `AbortSignal` для отмены запроса

**Возвращает:**
```typescript
TokenPrice | null // Включает bid и ask цены
```

**Эндпоинты:**
- `GET /api/v3/ticker/bookTicker?symbol={symbol}` (основной)
- `GET /api/v3/ticker/price?symbol={symbol}` (fallback)

**Пример:**
```typescript
import { getMexcPrice } from '@/api/endpoints/prices.api';

const price = await getMexcPrice('BTCUSDT');
console.log(price?.price); // 50000
console.log(price?.bid); // 49900
console.log(price?.ask); // 50100
```

---

### Spreads API

#### `getSpreadData(token: Token, timeframe?: TimeframeOption, signal?: AbortSignal): Promise<SpreadResponse>`

Получить данные спреда для токена с историей.

**Параметры:**
- `token`: `Token` - объект с `symbol` и `chain`
- `timeframe` (опционально): `TimeframeOption` - таймфрейм ('1m', '5m', '15m', '1h', '4h', '1d'), по умолчанию '1h'
- `signal` (опционально): `AbortSignal` для отмены запроса

**Возвращает:**
```typescript
interface SpreadResponse {
  symbol: string;
  chain: 'solana' | 'bsc';
  history: SpreadDataPoint[];
  current: CurrentData | null;
  sources: {
    mexc: boolean;
    jupiter: boolean;
    pancakeswap: boolean;
  };
}

interface SpreadDataPoint {
  timestamp: number;
  mexc_price: number | null;
  mexc_bid?: number | null;
  mexc_ask?: number | null;
  jupiter_price: number | null;
  pancakeswap_price: number | null;
}

interface CurrentData {
  timestamp: number;
  mexc_bid: number | null;
  mexc_ask: number | null;
  mexc_price: number | null;
  jupiter_price: number | null;
  pancakeswap_price: number | null;
}
```

**Пример:**
```typescript
import { getSpreadData } from '@/api/endpoints/spreads.api';

const spreadData = await getSpreadData(
  { symbol: 'BTC', chain: 'solana' },
  '1h'
);
console.log(spreadData.current); // Текущие цены
console.log(spreadData.history); // Исторические данные
```

---

#### `getSpreadsForTokens(tokens: Token[], signal?: AbortSignal, maxTokens?: number): Promise<Array<Token & { directSpread: number | null; reverseSpread: number | null; price: number | null }>>`

Получить спреды для списка токенов.

**Параметры:**
- `tokens`: `Token[]` - массив токенов
- `signal` (опционально): `AbortSignal` для отмены запроса
- `maxTokens` (опционально): `number` - максимальное количество токенов (по умолчанию 100)

**Возвращает:**
```typescript
Array<Token & {
  directSpread: number | null;
  reverseSpread: number | null;
  price: number | null;
}>
```

**Пример:**
```typescript
import { getSpreadsForTokens } from '@/api/endpoints/spreads.api';

const tokens = [
  { symbol: 'BTC', chain: 'solana' },
  { symbol: 'ETH', chain: 'bsc' },
];
const spreads = await getSpreadsForTokens(tokens, undefined, 10);
console.log(spreads[0].directSpread); // 1.5
```

---

### MEXC Limits API

#### `getMexcTradingLimits(symbol: string, signal?: AbortSignal): Promise<MexcTradingLimits | null>`

Получить лимиты на торговлю для токена MEXC.

**Параметры:**
- `symbol`: `string` - символ токена (например, 'BTCUSDT')
- `signal` (опционально): `AbortSignal` для отмены запроса

**Возвращает:**
```typescript
interface MexcTradingLimits {
  minNotional?: number;
  minQty?: number;
  maxQty?: number;
  stepSize?: number;
} | null
```

**Эндпоинт:**
- `GET /api/v3/exchangeInfo` (MEXC API)

**Пример:**
```typescript
import { getMexcTradingLimits } from '@/api/endpoints/mexc-limits.api';

const limits = await getMexcTradingLimits('BTCUSDT');
console.log(limits?.minNotional); // 10
console.log(limits?.minQty); // 0.00001
```

---

## 🔄 React Query Hooks

### `useTokens(): UseQueryResult<Token[], Error>`

Хук для получения токенов с кэшированием.

**Пример:**
```typescript
import { useTokens } from '@/api/hooks/useTokens';

function MyComponent() {
  const { data: tokens = [], isLoading, error } = useTokens();
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return <div>{tokens.length} tokens</div>;
}
```

---

### `useTokensWithSpreads(): { data: TokenWithData[], isLoading: boolean, error: Error | null, loadedCount: number, totalCount: number }`

Хук для получения токенов с ценами и спредами (постепенная загрузка).

**Пример:**
```typescript
import { useTokensWithSpreads } from '@/api/hooks/useTokensWithSpreads';

function MyComponent() {
  const { data, isLoading, loadedCount, totalCount } = useTokensWithSpreads();
  
  return (
    <div>
      Loaded: {loadedCount}/{totalCount}
      {data.map(token => (
        <div key={`${token.symbol}-${token.chain}`}>
          {token.symbol}: {token.price} (Spread: {token.directSpread}%)
        </div>
      ))}
    </div>
  );
}
```

---

### `useSpreadData(token: Token, timeframe?: TimeframeOption): UseQueryResult<SpreadResponse, Error>`

Хук для получения данных спреда с кэшированием.

**Пример:**
```typescript
import { useSpreadData } from '@/api/hooks/useSpreadData';

function MyComponent() {
  const { data, isLoading } = useSpreadData(
    { symbol: 'BTC', chain: 'solana' },
    '1h'
  );
  
  if (isLoading) return <div>Loading...</div>;
  
  return <div>Current spread: {data?.current}</div>;
}
```

---

## ⚙️ Конфигурация

### Переменные окружения

```bash
# API ключи (опционально)
VITE_JUPITER_API_KEY=your-jupiter-api-key
VITE_MEXC_API_KEY=your-mexc-api-key

# Режим работы API
# - direct: прямые вызовы к внешним API (по умолчанию)
# - backend: вызовы через бэкенд API Gateway
# - hybrid: бэкенд с автоматическим fallback на direct при ошибке
# - auto: автоматически определяет оптимальный режим (TODO: задача Ф4)
VITE_API_MODE=direct|backend|hybrid|auto

# URL бэкенда (если используется backend/hybrid/auto режим)
VITE_BACKEND_URL=https://api.backend.com

# Включить/выключить fallback в hybrid режиме (по умолчанию: true)
VITE_API_FALLBACK_ENABLED=true|false

# Прокси (dev режим)
VITE_USE_PROXY=true|false

# Mock данные (для тестов)
VITE_USE_MOCK_DATA=true|false
```

### Режимы работы API

#### Direct Mode (по умолчанию)
- Прямые вызовы к внешним API (Jupiter, PancakeSwap, MEXC)
- Не требует бэкенд
- Используется в production при отсутствии бэкенда

#### Backend Mode
- Все запросы идут через бэкенд API Gateway
- Требует `VITE_BACKEND_URL`
- Используется когда есть бэкенд

#### Hybrid Mode ✅
- Пытается использовать бэкенд
- При ошибке автоматически переключается на direct
- Использует Circuit Breaker паттерн (после 3 ошибок переключается на direct на 60 секунд)
- Логирует все fallback события
- Настраивается через `VITE_API_FALLBACK_ENABLED`

**Пример использования:**
```bash
VITE_API_MODE=hybrid
VITE_BACKEND_URL=https://api.backend.com
VITE_API_FALLBACK_ENABLED=true
```

#### Auto Mode ✅
- Автоматически определяет оптимальный режим
- Проверяет доступность бэкенда через health check (`/health` endpoint)
- Переключается между backend и direct в зависимости от доступности
- Логирует выбор режима в консоль
- Использует ленивую инициализацию (проверка выполняется при первом вызове)

**Пример использования:**
```bash
VITE_API_MODE=auto
VITE_BACKEND_URL=https://api.backend.com
```

**Как работает:**
1. При первом вызове API проверяет доступность бэкенда через `/health`
2. Если бэкенд доступен → использует `BackendApiAdapter`
3. Если бэкенд недоступен → использует `DirectApiAdapter`
4. Выбор режима кэшируется для всех последующих вызовов

---

## 🛡️ Обработка ошибок

### Типы ошибок

```typescript
// ApiError - ошибка API
class ApiError extends Error {
  statusCode: number;
  message: string;
}

// ValidationError - ошибка валидации
class ValidationError extends Error {
  field?: string;
}
```

### Обработка в коде

```typescript
import { getErrorMessage } from '@/utils/errors';

try {
  const tokens = await getAllTokens();
} catch (error) {
  const message = getErrorMessage(error);
  console.error(message);
}
```

---

## 🔒 Безопасность

### Rate Limiting

Все API вызовы проходят через `rateLimiter`:
- Максимум: 10 запросов в секунду на источник
- Автоматический exponential backoff при превышении

### Request Queue

Запросы обрабатываются через очередь:
- Приоритеты: `HIGH`, `NORMAL`, `LOW`
- Максимум параллельных запросов: 5
- Автоматический retry с exponential backoff

---

## 📊 Примеры использования

### Получить все токены

```typescript
import { getAllTokens } from '@/api/endpoints/tokens.api';

const tokens = await getAllTokens();
console.log(`Found ${tokens.length} tokens`);
```

### Получить цены для токена

```typescript
import { getAllPrices } from '@/api/endpoints/prices.api';

const prices = await getAllPrices({ symbol: 'BTC', chain: 'solana' });
console.log('Jupiter:', prices.jupiter?.price);
console.log('MEXC:', prices.mexc?.price);
```

### Получить спред для токена

```typescript
import { getSpreadData } from '@/api/endpoints/spreads.api';

const spreadData = await getSpreadData(
  { symbol: 'BTC', chain: 'solana' },
  '1h'
);

const directSpread = calculateSpread(
  spreadData.current?.jupiter_price,
  spreadData.current?.mexc_price
);
console.log('Direct spread:', directSpread);
```

---

## 🐛 Troubleshooting

### CORS ошибки

**Проблема:** CORS ошибки в production

**Решение:**
- В dev-режиме используется прокси через Vite
- В production нужны Edge Functions или бэкенд
- См. задачу 7 в TODO.md

### Rate Limit ошибки

**Проблема:** 429 Too Many Requests

**Решение:**
- Rate limiter автоматически обрабатывает это
- Увеличить интервал между запросами
- Использовать кэширование React Query

### Таймауты

**Проблема:** Request timeout

**Решение:**
- Таймаут по умолчанию: 30 секунд
- Можно увеличить в `API_CONFIG.TIMEOUT`

---

## 📚 Дополнительные ресурсы

- [Jupiter API Documentation](https://docs.jup.ag/)
- [DexScreener API Documentation](https://docs.dexscreener.com/)
- [MEXC API Documentation](https://mexcdevelop.github.io/apidocs/)
- [React Query Documentation](https://tanstack.com/query/latest)

---

**Последнее обновление:** 2024-12-20

