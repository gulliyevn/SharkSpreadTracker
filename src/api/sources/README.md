# API Sources - Плагинная система для источников данных

Эта директория содержит универсальную систему для работы с различными API источниками (биржами, DEX и т.д.).

## Архитектура

### Интерфейс `IApiSource`

Универсальный интерфейс, который должен реализовывать каждый источник:

```typescript
interface IApiSource {
  readonly id: SourceType;
  readonly name: string;
  readonly supportedChains: ('solana' | 'bsc')[];
  
  getTokens(signal?: AbortSignal): Promise<Token[]>;
  getPrice(symbol: string, address?: string, signal?: AbortSignal): Promise<TokenPrice | null>;
  getPrices(tokens: Token[], signal?: AbortSignal): Promise<Array<TokenPrice | null>>;
  supportsChain(chain: 'solana' | 'bsc'): boolean;
  requiresAddress(): boolean;
}
```

### Базовый класс `BaseApiSource`

Предоставляет общую функциональность:
- Rate limiting через `rateLimiter`
- Обработка ошибок
- Логирование
- Queue management через `queuedRequest`
- Circuit breaker логика

## Как добавить новый источник

### Шаг 1: Создать клиент API

Создайте файл в `src/api/clients/`:

```typescript
// src/api/clients/newsource.client.ts
import axios, { type AxiosInstance } from 'axios';
import { SOURCE_URLS, API_CONFIG } from '@/constants/api';

export const newsourceClient: AxiosInstance = axios.create({
  baseURL: SOURCE_URLS.NEWSOURCE, // Добавьте в constants/api.ts
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### Шаг 2: Добавить конфигурацию

В `src/constants/api.ts`:

```typescript
export const SOURCE_URLS = {
  // ... существующие
  NEWSOURCE: 'https://api.newsource.com',
};
```

В `src/constants/sources.ts`:

```typescript
export const SOURCES: Record<SourceType, SourceConfig> = {
  // ... существующие
  newsource: {
    id: 'newsource',
    label: 'NewSource',
    emoji: '🆕',
    colorTailwind: 'text-blue-400',
    colorHex: '#60a5fa',
    chains: ['solana'], // или ['bsc'], или ['solana', 'bsc']
    priceField: 'newsource_price',
  },
};
```

В `src/types/index.ts`:

```typescript
export type SourceType = 'mexc' | 'jupiter' | 'pancakeswap' | 'newsource';
```

### Шаг 3: Создать класс источника

Создайте файл `src/api/sources/NewSource.ts`:

```typescript
import { BaseApiSource } from './BaseApiSource';
import type { Token, TokenPrice } from '@/types';
import { newsourceClient } from '../clients';
import { logger } from '@/utils/logger';
import { validateTokenSymbol } from '@/utils/validation';

export class NewSource extends BaseApiSource {
  readonly id = 'newsource' as const;
  readonly name = 'NewSource';
  readonly supportedChains: ('solana' | 'bsc')[] = ['solana']; // или ['bsc'], или ['solana', 'bsc']

  protected get rateLimitKey(): string {
    return 'newsource-api';
  }

  // Переопределите, если требуется адрес для получения цены
  requiresAddress(): boolean {
    return false; // или true, если требуется
  }

  /**
   * Получить токены из NewSource API
   */
  protected async fetchTokens(signal?: AbortSignal): Promise<Token[]> {
    try {
      const response = await newsourceClient.get('/tokens', { signal });
      
      // Преобразуйте ответ API в формат Token[]
      const tokens: Token[] = [];
      // ... логика парсинга
      
      return tokens;
    } catch (error) {
      throw error; // BaseApiSource обработает ошибку
    }
  }

  /**
   * Получить цену токена из NewSource API
   */
  protected async fetchPrice(
    symbol: string,
    address?: string,
    signal?: AbortSignal
  ): Promise<TokenPrice | null> {
    try {
      // Валидация символа
      if (!validateTokenSymbol(symbol)) {
        logger.debug(`NewSource price: invalid symbol "${symbol}"`);
        return null;
      }

      // Если требуется адрес, проверьте его наличие
      if (this.requiresAddress() && !address) {
        logger.debug(`NewSource price: address required for ${symbol}`);
        return null;
      }

      // Запрос к API
      const endpoint = address 
        ? `/price?symbol=${symbol}&address=${address}`
        : `/price?symbol=${symbol}`;
      const response = await newsourceClient.get(endpoint, { signal });

      // Парсинг ответа
      const price = parseFloat(response.data.price);
      if (isNaN(price) || price <= 0) {
        return null;
      }

      return {
        price,
        timestamp: Date.now(),
        source: 'newsource',
      };
    } catch (error) {
      throw error; // BaseApiSource обработает ошибку
    }
  }
}
```

### Шаг 4: Зарегистрировать источник

В `src/api/sources/index.ts`:

```typescript
import { NewSource } from './NewSource';

export function createSources(): IApiSource[] {
  return [
    new JupiterSource(),
    new PancakeSource(),
    new MexcSource(),
    new NewSource(), // Добавьте новый источник
  ];
}
```

### Шаг 5: Обновить типы SpreadResponse

В `src/types/index.ts` добавьте поля для нового источника:

```typescript
export interface SpreadDataPoint {
  timestamp: number;
  mexc_price: number | null;
  jupiter_price: number | null;
  pancakeswap_price: number | null;
  newsource_price: number | null; // Добавьте
}

export interface CurrentData {
  timestamp: number;
  mexc_price: number | null;
  jupiter_price: number | null;
  pancakeswap_price: number | null;
  newsource_price: number | null; // Добавьте
}

export interface SpreadResponse {
  symbol: string;
  chain: 'solana' | 'bsc';
  history: SpreadDataPoint[];
  current: CurrentData | null;
  sources: {
    mexc: boolean;
    jupiter: boolean;
    pancakeswap: boolean;
    newsource: boolean; // Добавьте
  };
}
```

### Шаг 6: Обновить функции получения цен и спредов

Обновите `src/api/endpoints/prices.api.ts` и `src/api/endpoints/spreads.api.ts` для поддержки нового источника.

## Примеры использования

### Получить все источники

```typescript
import { createSources } from '@/api/sources';

const sources = createSources();
```

### Получить источник по ID

```typescript
import { getSourceById } from '@/api/sources';

const jupiterSource = getSourceById('jupiter');
if (jupiterSource) {
  const tokens = await jupiterSource.getTokens();
}
```

### Получить источники для блокчейна

```typescript
import { getSourcesForChain } from '@/api/sources';

const solanaSources = getSourcesForChain('solana');
```

### Получить цену из конкретного источника

```typescript
const jupiterSource = getSourceById('jupiter');
if (jupiterSource) {
  const price = await jupiterSource.getPrice('SOL', 'So11111111111111111111111111111111111111112');
}
```

## Преимущества новой архитектуры

1. **Единообразие**: Все источники используют один интерфейс
2. **Переиспользование**: Базовая функциональность в `BaseApiSource`
3. **Расширяемость**: Легко добавить новый источник
4. **Тестируемость**: Каждый источник можно тестировать изолированно
5. **Типобезопасность**: TypeScript гарантирует правильную реализацию

## Дополнительные возможности

### Переопределение приоритета запросов

```typescript
protected get requestPriority(): RequestPriority {
  return RequestPriority.HIGH; // По умолчанию NORMAL
}
```

### Переопределение максимального количества повторных попыток

```typescript
protected get maxRetries(): number {
  return 3; // По умолчанию 2
}
```

### Кастомная обработка ошибок

```typescript
protected handleError(operation: string, error: unknown): void {
  // Кастомная логика обработки ошибок
  super.handleError(operation, error);
}
```

### Batch запросы для getPrices

Если API поддерживает batch запросы, переопределите `getPrices`:

```typescript
async getPrices(
  tokens: Token[],
  signal?: AbortSignal
): Promise<Array<TokenPrice | null>> {
  // Реализация batch запроса
  const addresses = tokens.map(t => t.address).join(',');
  const response = await newsourceClient.get(`/prices?addresses=${addresses}`, { signal });
  // ... парсинг ответа
}
```

## Тестирование

Создайте тесты для нового источника в `src/api/sources/__tests__/NewSource.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { NewSource } from '../NewSource';

describe('NewSource', () => {
  it('should fetch tokens', async () => {
    const source = new NewSource();
    const tokens = await source.getTokens();
    expect(tokens).toBeInstanceOf(Array);
  });

  it('should fetch price', async () => {
    const source = new NewSource();
    const price = await source.getPrice('TOKEN');
    expect(price).toBeDefined();
  });
});
```

