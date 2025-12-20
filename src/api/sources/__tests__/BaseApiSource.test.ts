import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseApiSource } from '../BaseApiSource';
import type { Token } from '@/types';
import type { TokenPrice } from '@/api/endpoints/prices.api';
import { rateLimiter } from '@/utils/security';

// Мокируем зависимости
vi.mock('@/utils/security', () => ({
  rateLimiter: {
    isAllowed: vi.fn(() => true),
  },
}));

vi.mock('@/utils/request-queue', () => ({
  queuedRequest: vi.fn(async (fn, _options) => {
    return await fn();
  }),
  RequestPriority: {
    NORMAL: 2,
    HIGH: 3,
    LOW: 1,
    CRITICAL: 4,
  },
}));

vi.mock('@/utils/errors', () => ({
  isCanceledError: vi.fn(() => false),
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Создаем тестовый класс, наследующий BaseApiSource
class TestSource extends BaseApiSource {
  readonly id = 'jupiter' as const;
  readonly name = 'Test Source';
  readonly supportedChains: ('solana' | 'bsc')[] = ['solana'];

  protected async fetchTokens(): Promise<Token[]> {
    return [
      { symbol: 'SOL', chain: 'solana', address: 'So11111111111111111111111111111111111111112' },
    ];
  }

  protected async fetchPrice(
    symbol: string,
    address?: string
  ): Promise<TokenPrice | null> {
    if (symbol === 'SOL' && address) {
      return {
        price: 100,
        timestamp: Date.now(),
        source: 'jupiter',
      };
    }
    return null;
  }
}

describe('BaseApiSource', () => {
  let source: TestSource;

  beforeEach(() => {
    source = new TestSource();
    vi.clearAllMocks();
    // Убеждаемся что rateLimiter разрешает запросы
    vi.mocked(rateLimiter.isAllowed).mockReturnValue(true);
  });

  describe('getTokens', () => {
    it('should fetch tokens successfully', async () => {
      const tokens = await source.getTokens();
      expect(tokens).toHaveLength(1);
      expect(tokens[0]?.symbol).toBe('SOL');
    });

    it('should check rate limit before fetching', async () => {
      await source.getTokens();
      expect(rateLimiter.isAllowed).toHaveBeenCalledWith('jupiter-api');
    });

    it('should return empty array when rate limit exceeded', async () => {
      vi.mocked(rateLimiter.isAllowed).mockReturnValue(false);
      const tokens = await source.getTokens();
      expect(tokens).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      const errorSource = new (class extends BaseApiSource {
        readonly id = 'jupiter' as const;
        readonly name = 'Error Source';
        readonly supportedChains: ('solana' | 'bsc')[] = ['solana'];

        protected async fetchTokens(): Promise<Token[]> {
          throw new Error('Test error');
        }

        protected async fetchPrice(): Promise<TokenPrice | null> {
          return null;
        }
      })();

      const tokens = await errorSource.getTokens();
      expect(tokens).toEqual([]);
    });
  });

  describe('getPrice', () => {
    it('should fetch price successfully', async () => {
      // TestSource требует адрес для fetchPrice, передаем его
      const address = 'So11111111111111111111111111111111111111112';
      const price = await source.getPrice('SOL', address);
      expect(price).not.toBeNull();
      expect(price?.price).toBe(100);
      expect(price?.source).toBe('jupiter');
    });

    it('should return null when address is required but not provided', async () => {
      const addressSource = new (class extends BaseApiSource {
        readonly id = 'jupiter' as const;
        readonly name = 'Address Source';
        readonly supportedChains: ('solana' | 'bsc')[] = ['solana'];

        requiresAddress(): boolean {
          return true;
        }

        protected async fetchTokens(): Promise<Token[]> {
          return [];
        }

        protected async fetchPrice(): Promise<TokenPrice | null> {
          return null;
        }
      })();

      const price = await addressSource.getPrice('SOL');
      expect(price).toBeNull();
    });

    it('should check rate limit before fetching price', async () => {
      await source.getPrice('SOL', 'So11111111111111111111111111111111111111112');
      expect(rateLimiter.isAllowed).toHaveBeenCalled();
    });
  });

  describe('getPrices', () => {
    it('should fetch prices for multiple tokens', async () => {
      const tokens: Token[] = [
        { symbol: 'SOL', chain: 'solana', address: 'So11111111111111111111111111111111111111112' },
        { symbol: 'BTC', chain: 'solana', address: 'test-address' },
      ];

      const prices = await source.getPrices(tokens);
      expect(prices).toHaveLength(2);
      // Первый токен должен вернуть цену (SOL с правильным адресом)
      expect(prices[0]).not.toBeNull();
      expect(prices[0]?.price).toBe(100);
      // Второй токен должен вернуть null (BTC не обрабатывается в fetchPrice)
      expect(prices[1]).toBeNull();
    });
  });

  describe('supportsChain', () => {
    it('should return true for supported chain', () => {
      expect(source.supportsChain('solana')).toBe(true);
    });

    it('should return false for unsupported chain', () => {
      expect(source.supportsChain('bsc')).toBe(false);
    });
  });

  describe('requiresAddress', () => {
    it('should return false by default', () => {
      expect(source.requiresAddress()).toBe(false);
    });
  });
});

