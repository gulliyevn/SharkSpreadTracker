# API Integration Guide

Полное руководство по интеграции с API для получения данных о токенах, ценах и спредах.

## 📋 Содержание

- [Обзор](#обзор)
- [Режимы работы API](#режимы-работы-api)
- [API Endpoints](#api-endpoints)
  - [Tokens API](#tokens-api)
  - [Prices API](#prices-api)
  - [Spreads API](#spreads-api)
- [Примеры использования](#примеры-использования)
- [Обработка ошибок](#обработка-ошибок)
- [Типы данных](#типы-данных)
- [Конфигурация](#конфигурация)

## Обзор

Проект использует адаптерную архитектуру для работы с API, которая позволяет:
- Работать без бэкенда (direct режим)
- Автоматически переключаться на бэкенд при его доступности
- Автоматически возвращаться на фронт при падении бэкенда
- Поддерживать несколько источников данных (Jupiter, PancakeSwap, MEXC)

Подробнее о режимах работы см. [API_MODES.md](./API_MODES.md).

## Режимы работы API

### Direct Mode (по умолчанию)
Прямые вызовы к внешним API (Jupiter, PancakeSwap, MEXC).

```typescript
// .env
VITE_API_MODE=direct
```

### Backend Mode
Вызовы через бэкенд API Gateway с автоматическим fallback на direct.

```typescript
// .env
VITE_API_MODE=backend
VITE_BACKEND_URL=https://api.your-backend.com
```

### Hybrid Mode
Бэкенд с автоматическим fallback на direct при ошибке (Circuit Breaker).

```typescript
// .env
VITE_API_MODE=hybrid
VITE_BACKEND_URL=https://api.your-backend.com
```

### Auto Mode
Автоматически определяет оптимальный режим и переключается при изменении доступности.

```typescript
// .env
VITE_API_MODE=auto
VITE_BACKEND_URL=https://api.your-backend.com
```

## API Endpoints

### Tokens API

#### `getAllTokens(signal?: AbortSignal): Promise<TokenWithData[]>`

Получить все токены из всех источников (Jupiter, PancakeSwap, MEXC).

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
import { getAllTokens } from '@/api/adapters/api-adapter';

const tokens = await getAllTokens();
console.log(tokens); // [{ symbol: 'BTC', chain: 'solana', price: 50000, ... }, ...]
```

#### `getJupiterTokens(signal?: AbortSignal): Promise<Token[]>`

Получить токены только из Jupiter (Solana).

**Пример:**
```typescript
import { getJupiterTokens } from '@/api/adapters/api-adapter';

const tokens = await getJupiterTokens();
console.log(tokens); // [{ symbol: 'SOL', chain: 'solana', address: '...' }, ...]
```

#### `getPancakeTokens(signal?: AbortSignal): Promise<Token[]>`

Получить токены только из PancakeSwap (BSC).

**Пример:**
```typescript
import { getPancakeTokens } from '@/api/adapters/api-adapter';

const tokens = await getPancakeTokens();
console.log(tokens); // [{ symbol: 'BNB', chain: 'bsc', address: '...' }, ...]
```

#### `getMexcTokens(signal?: AbortSignal): Promise<Token[]>`

Получить токены только из MEXC.

**Пример:**
```typescript
import { getMexcTokens } from '@/api/adapters/api-adapter';

const tokens = await getMexcTokens();
console.log(tokens); // [{ symbol: 'BTC', chain: 'solana' }, ...]
```

### Prices API

#### `getAllPrices(token: Token, signal?: AbortSignal): Promise<AllPrices>`

Получить цены токена из всех источников.

**Параметры:**
- `token: Token` - объект токена с `symbol` и `chain`
- `signal?: AbortSignal` - опциональный сигнал отмены запроса

**Возвращает:**
```typescript
interface AllPrices {
  jupiter: TokenPrice | null;
  pancakeswap: TokenPrice | null;
  mexc: TokenPrice | null;
}

interface TokenPrice {
  price: number;
  timestamp: number;
  source: 'jupiter' | 'pancakeswap' | 'mexc';
}
```

**Пример:**
```typescript
import { getAllPrices } from '@/api/adapters/api-adapter';

const token = { symbol: 'BTC', chain: 'solana' };
const prices = await getAllPrices(token);
console.log(prices);
// {
//   jupiter: { price: 50000, timestamp: 1234567890, source: 'jupiter' },
//   pancakeswap: null,
//   mexc: { price: 50010, timestamp: 1234567890, source: 'mexc' }
// }
```

#### `getJupiterPrice(symbol: string, address?: string, signal?: AbortSignal): Promise<TokenPrice | null>`

Получить цену токена из Jupiter.

**Пример:**
```typescript
import { getJupiterPrice } from '@/api/adapters/api-adapter';

const price = await getJupiterPrice('BTC', 'So11111111111111111111111111111111111111112');
console.log(price); // { price: 50000, timestamp: 1234567890, source: 'jupiter' }
```

#### `getPancakePrice(symbol: string, signal?: AbortSignal): Promise<TokenPrice | null>`

Получить цену токена из PancakeSwap.

**Пример:**
```typescript
import { getPancakePrice } from '@/api/adapters/api-adapter';

const price = await getPancakePrice('BNB');
console.log(price); // { price: 300, timestamp: 1234567890, source: 'pancakeswap' }
```

#### `getMexcPrice(symbol: string, signal?: AbortSignal): Promise<TokenPrice | null>`

Получить цену токена из MEXC.

**Пример:**
```typescript
import { getMexcPrice } from '@/api/adapters/api-adapter';

const price = await getMexcPrice('BTC');
console.log(price); // { price: 50000, timestamp: 1234567890, source: 'mexc' }
```

### Spreads API

#### `getSpreadData(token: Token, timeframe?: TimeframeOption, signal?: AbortSignal): Promise<SpreadResponse>`

Получить данные о спреде для токена.

**Параметры:**
- `token: Token` - объект токена
- `timeframe?: TimeframeOption` - таймфрейм ('1m' | '5m' | '15m' | '1h' | '4h' | '1d'), по умолчанию '1h'
- `signal?: AbortSignal` - опциональный сигнал отмены

**Возвращает:**
```typescript
interface SpreadResponse {
  current: {
    directSpread: number | null;
    reverseSpread: number | null;
  };
  sources: {
    jupiter: TokenPrice | null;
    pancakeswap: TokenPrice | null;
    mexc: TokenPrice | null;
  };
  history?: SpreadDataPoint[];
}

interface SpreadDataPoint {
  timestamp: number;
  mexc_price: number | null;
  jupiter_price: number | null;
  pancakeswap_price: number | null;
}
```

**Пример:**
```typescript
import { getSpreadData } from '@/api/adapters/api-adapter';

const token = { symbol: 'BTC', chain: 'solana' };
const spread = await getSpreadData(token, '1h');
console.log(spread);
// {
//   current: { directSpread: 100, reverseSpread: -100 },
//   sources: { jupiter: {...}, mexc: {...}, pancakeswap: null },
//   history: [...]
// }
```

#### `getSpreadsForTokens(tokens: Token[], signal?: AbortSignal, maxTokens?: number): Promise<Array<Token & SpreadData>>`

Получить спреды для нескольких токенов одновременно.

**Параметры:**
- `tokens: Token[]` - массив токенов
- `signal?: AbortSignal` - опциональный сигнал отмены
- `maxTokens?: number` - максимальное количество токенов (по умолчанию 100)

**Пример:**
```typescript
import { getSpreadsForTokens } from '@/api/adapters/api-adapter';

const tokens = [
  { symbol: 'BTC', chain: 'solana' },
  { symbol: 'ETH', chain: 'solana' },
];
const spreads = await getSpreadsForTokens(tokens);
console.log(spreads);
// [
//   { symbol: 'BTC', chain: 'solana', directSpread: 100, reverseSpread: -100, price: 50000 },
//   { symbol: 'ETH', chain: 'solana', directSpread: 50, reverseSpread: -50, price: 3000 }
// ]
```

## Примеры использования

### Использование с React Query

```typescript
import { useQuery } from '@tanstack/react-query';
import { getAllTokens } from '@/api/adapters/api-adapter';

function TokensList() {
  const { data: tokens, isLoading, error } = useQuery({
    queryKey: ['tokens'],
    queryFn: () => getAllTokens(),
    staleTime: 60000, // 1 минута
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {tokens?.map((token) => (
        <li key={`${token.symbol}-${token.chain}`}>
          {token.symbol} - {token.chain}
        </li>
      ))}
    </ul>
  );
}
```

### Использование с AbortSignal

```typescript
import { useEffect, useRef } from 'react';
import { getAllTokens } from '@/api/adapters/api-adapter';

function TokensComponent() {
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    getAllTokens(controller.signal)
      .then((tokens) => {
        console.log('Tokens:', tokens);
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          console.error('Error:', error);
        }
      });

    return () => {
      controller.abort();
    };
  }, []);

  return <div>Tokens loaded</div>;
}
```

### Использование с обработкой ошибок

```typescript
import { getAllPrices } from '@/api/adapters/api-adapter';
import { ApiError, isNetworkError } from '@/utils/errors';

async function fetchPrice(token: Token) {
  try {
    const prices = await getAllPrices(token);
    return prices;
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`API Error ${error.statusCode}: ${error.message}`);
    } else if (isNetworkError(error)) {
      console.error('Network error:', error);
    } else {
      console.error('Unknown error:', error);
    }
    throw error;
  }
}
```

## Обработка ошибок

API адаптер автоматически обрабатывает ошибки и переключается между режимами:

### Типы ошибок

```typescript
// ApiError - ошибка API с кодом статуса
class ApiError extends Error {
  statusCode: number;
  details?: unknown;
}

// ValidationError - ошибка валидации данных
class ValidationError extends Error {
  field?: string;
}
```

### Утилиты для обработки ошибок

```typescript
import {
  getApiErrorTranslationKey,
  getErrorMessage,
  isNetworkError,
  isTimeoutError,
} from '@/utils/errors';

try {
  const tokens = await getAllTokens();
} catch (error) {
  if (isNetworkError(error)) {
    // Обработка сетевой ошибки
    console.error('Network error');
  } else if (isTimeoutError(error)) {
    // Обработка таймаута
    console.error('Request timeout');
  } else {
    // Другая ошибка
    const message = getErrorMessage(error);
    const translationKey = getApiErrorTranslationKey(error);
    console.error(message, translationKey);
  }
}
```

## Типы данных

### Token

```typescript
interface Token {
  symbol: string;        // Символ токена (например, 'BTC', 'ETH')
  chain: 'solana' | 'bsc'; // Блокчейн
  address?: string;      // Адрес контракта (опционально)
}
```

### TokenWithData

```typescript
interface TokenWithData extends Token {
  price?: number | null;
  directSpread?: number | null;
  reverseSpread?: number | null;
}
```

### TokenPrice

```typescript
interface TokenPrice {
  price: number;         // Цена токена
  timestamp: number;     // Временная метка
  source: 'jupiter' | 'pancakeswap' | 'mexc';
}
```

### SpreadResponse

```typescript
interface SpreadResponse {
  current: {
    directSpread: number | null;   // Прямой спред
    reverseSpread: number | null;   // Обратный спред
  };
  sources: {
    jupiter: TokenPrice | null;
    pancakeswap: TokenPrice | null;
    mexc: TokenPrice | null;
  };
  history?: SpreadDataPoint[];
}
```

### TimeframeOption

```typescript
type TimeframeOption = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
```

## Конфигурация

### Переменные окружения

```bash
# Режим работы API
VITE_API_MODE=direct|backend|hybrid|auto

# URL бэкенда (для режимов backend, hybrid, auto)
VITE_BACKEND_URL=https://api.your-backend.com

# Интервал health check (в миллисекундах)
VITE_HEALTH_CHECK_INTERVAL=30000

# WebSocket URL (опционально)
VITE_WEBSOCKET_URL=wss://api.your-backend.com/ws

# Использование прокси (true/false)
VITE_USE_PROXY=true
```

### Настройка в коде

```typescript
import { API_MODE, BACKEND_URL } from '@/api/adapters/api-adapter';

console.log('Current API mode:', API_MODE);
console.log('Backend URL:', BACKEND_URL);
```

## Дополнительные ресурсы

- [API_MODES.md](./API_MODES.md) - подробная документация по режимам работы API
- [README.md](../README.md) - общая информация о проекте
- [ARCHITECTURE.md](../MD/ARCHITECTURE.md) - архитектура проекта

## Поддержка

При возникновении проблем:
1. Проверьте конфигурацию в `.env`
2. Убедитесь, что режим API настроен правильно
3. Проверьте логи в консоли браузера
4. Убедитесь, что бэкенд доступен (если используется режим backend/hybrid/auto)

