import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getJupiterPrice,
  getPancakePrice,
  getMexcPrice,
  getAllPrices,
} from '../prices.api';
import { jupiterClient, pancakeClient, mexcClient } from '../../clients';
import type { Token } from '@/types';

vi.mock('../../clients', () => ({
  jupiterClient: {
    get: vi.fn(),
  },
  pancakeClient: {
    get: vi.fn(),
  },
  mexcClient: {
    get: vi.fn(),
  },
}));

describe('prices.api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getJupiterPrice', () => {
    it('should fetch Jupiter price successfully', async () => {
      const mockAddress = 'So11111111111111111111111111111111111111112';
      const mockResponse = {
        data: {
          [mockAddress]: {
            usdPrice: 50000,
          },
        },
      };

      vi.mocked(jupiterClient.get).mockResolvedValue(mockResponse);

      const result = await getJupiterPrice('BTC', mockAddress);

      expect(result).toBeDefined();
      expect(result?.price).toBe(50000);
      expect(result?.source).toBe('jupiter');
    });

    it('should return null on error', async () => {
      vi.mocked(jupiterClient.get).mockRejectedValue(new Error('API Error'));

      const result = await getJupiterPrice('BTC');

      expect(result).toBeNull();
    });

    it('should return null when validation fails', async () => {
      vi.mocked(jupiterClient.get).mockResolvedValue({
        data: { invalid: 'data' },
      });

      const result = await getJupiterPrice('BTC');

      expect(result).toBeNull();
    });

    it('should return null when price is null', async () => {
      vi.mocked(jupiterClient.get).mockResolvedValue({
        data: { BTC: { price: null, time: Date.now() } },
      });

      const result = await getJupiterPrice('BTC');

      expect(result).toBeNull();
    });
  });

  describe('getPancakePrice', () => {
    it('should fetch PancakeSwap price successfully', async () => {
      const mockResponse = {
        data: {
          pairs: [
            {
              baseToken: { symbol: 'CAKE' },
              chainId: 'bsc',
              priceUsd: '2.5',
            },
          ],
        },
      };

      vi.mocked(pancakeClient.get).mockResolvedValue(mockResponse);

      const result = await getPancakePrice('CAKE');

      expect(result).toBeDefined();
      expect(result?.price).toBe(2.5);
      expect(result?.source).toBe('pancakeswap');
    });

    it('should return null on error', async () => {
      vi.mocked(pancakeClient.get).mockRejectedValue(new Error('API Error'));

      const result = await getPancakePrice('CAKE');

      expect(result).toBeNull();
    });

    it('should return null when no matching pair found', async () => {
      vi.mocked(pancakeClient.get).mockResolvedValue({
        data: {
          pairs: [
            {
              baseToken: { symbol: 'OTHER' },
              chainId: 'bsc',
              priceUsd: '1.0',
            },
          ],
        },
      });

      const result = await getPancakePrice('CAKE');

      expect(result).toBeNull();
    });

    it('should return null when price is invalid (NaN)', async () => {
      vi.mocked(pancakeClient.get).mockResolvedValue({
        data: {
          pairs: [
            {
              baseToken: { symbol: 'CAKE' },
              chainId: 'bsc',
              priceUsd: 'invalid',
            },
          ],
        },
      });

      const result = await getPancakePrice('CAKE');

      expect(result).toBeNull();
    });

    it('should return null when price is zero or negative', async () => {
      vi.mocked(pancakeClient.get).mockResolvedValue({
        data: {
          pairs: [
            {
              baseToken: { symbol: 'CAKE' },
              chainId: 'bsc',
              priceUsd: '0',
            },
          ],
        },
      });

      const result = await getPancakePrice('CAKE');

      expect(result).toBeNull();
    });
  });

  describe('getMexcPrice', () => {
    it('should fetch MEXC price successfully', async () => {
      const mockResponse = {
        data: {
          symbol: 'BTCUSDT',
          price: '50000',
          bidPrice: '49900',
          askPrice: '50100',
        },
      };

      vi.mocked(mexcClient.get).mockResolvedValue(mockResponse);

      const result = await getMexcPrice('BTCUSDT');

      expect(result).toBeDefined();
      expect(result?.price).toBe(50000);
      expect(result?.bid).toBe(49900);
      expect(result?.ask).toBe(50100);
      expect(result?.source).toBe('mexc');
    });

    it('should return null on error', async () => {
      vi.mocked(mexcClient.get).mockRejectedValue(new Error('API Error'));

      const result = await getMexcPrice('BTCUSDT');

      expect(result).toBeNull();
    });

    it('should fallback to ticker/price endpoint when bookTicker validation fails', async () => {
      // Первый вызов возвращает данные, которые не проходят валидацию
      vi.mocked(mexcClient.get)
        .mockResolvedValueOnce({
          data: { invalid: 'data' }, // Не проходит валидацию MexcTickerSchema
        })
        .mockResolvedValueOnce({
          data: { price: '50000' }, // Fallback endpoint
        });

      const result = await getMexcPrice('BTCUSDT');

      expect(result).toBeDefined();
      expect(result?.price).toBe(50000);
      expect(result?.source).toBe('mexc');
    });

    it('should return null when price is invalid', async () => {
      vi.mocked(mexcClient.get).mockResolvedValue({
        data: {
          price: 'invalid',
        },
      });

      const result = await getMexcPrice('BTCUSDT');

      expect(result).toBeNull();
    });
  });

  describe('getAllPrices', () => {
    it('should fetch all prices for solana token', async () => {
      const mockToken: Token = { symbol: 'BTC', chain: 'solana' };

      vi.mocked(jupiterClient.get).mockResolvedValue({
        data: { BTC: { price: 50000, time: Date.now() } },
      });
      vi.mocked(pancakeClient.get).mockResolvedValue({
        data: { pairs: [] },
      });
      vi.mocked(mexcClient.get).mockResolvedValue({
        data: { price: '50000' },
      });

      const result = await getAllPrices(mockToken);

      expect(result).toBeDefined();
      expect(result.symbol).toBe('BTC');
      expect(result.chain).toBe('solana');
      expect(result.jupiter).toBeDefined();
      expect(result.pancakeswap).toBeNull(); // BSC only
      expect(result.mexc).toBeDefined();
    });

    it('should fetch all prices for bsc token', async () => {
      const mockToken: Token = { symbol: 'CAKE', chain: 'bsc' };

      vi.mocked(jupiterClient.get).mockResolvedValue({
        data: {},
      });
      vi.mocked(pancakeClient.get).mockResolvedValue({
        data: {
          pairs: [
            {
              baseToken: { symbol: 'CAKE' },
              chainId: 'bsc',
              priceUsd: '2.5',
            },
          ],
        },
      });
      vi.mocked(mexcClient.get).mockResolvedValue({
        data: { price: '2.5' },
      });

      const result = await getAllPrices(mockToken);

      expect(result).toBeDefined();
      expect(result.symbol).toBe('CAKE');
      expect(result.chain).toBe('bsc');
      expect(result.jupiter).toBeNull(); // Solana only
      expect(result.pancakeswap).toBeDefined();
      expect(result.mexc).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      const mockToken: Token = { symbol: 'BTC', chain: 'solana' };

      vi.mocked(jupiterClient.get).mockRejectedValue(
        new Error('Jupiter error')
      );
      vi.mocked(pancakeClient.get).mockRejectedValue(
        new Error('Pancake error')
      );
      vi.mocked(mexcClient.get).mockRejectedValue(new Error('MEXC error'));

      const result = await getAllPrices(mockToken);

      expect(result).toBeDefined();
      expect(result.jupiter).toBeNull();
      expect(result.pancakeswap).toBeNull();
      expect(result.mexc).toBeNull();
    });
  });
});
