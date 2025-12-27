/**
 * Тесты для token-utils
 */

import { describe, it, expect } from 'vitest';
import type { Token, StraightData } from '@/types';
import {
  networkToChain,
  chainToNetwork,
  normalizeSymbol,
  normalizeNetwork,
  matchesToken,
  filterByToken,
  filterBySymbolAndNetwork,
  extractValidPrices,
  calculateAveragePrice,
  extractBestSpread,
} from '../token-utils';

describe('token-utils', () => {
  describe('networkToChain', () => {
    it('should convert "bsc" to "bsc"', () => {
      expect(networkToChain('bsc')).toBe('bsc');
    });

    it('should convert "BSC" to "bsc"', () => {
      expect(networkToChain('BSC')).toBe('bsc');
    });

    it('should convert "bep20" to "bsc"', () => {
      expect(networkToChain('bep20')).toBe('bsc');
    });

    it('should convert "solana" to "solana"', () => {
      expect(networkToChain('solana')).toBe('solana');
    });

    it('should default to "solana" for unknown networks', () => {
      expect(networkToChain('unknown')).toBe('solana');
    });

    it('should handle null', () => {
      expect(networkToChain(null)).toBe('solana');
    });

    it('should handle undefined', () => {
      expect(networkToChain(undefined)).toBe('solana');
    });
  });

  describe('chainToNetwork', () => {
    it('should convert "bsc" to "bsc"', () => {
      expect(chainToNetwork('bsc')).toBe('bsc');
    });

    it('should convert "solana" to "solana"', () => {
      expect(chainToNetwork('solana')).toBe('solana');
    });
  });

  describe('normalizeSymbol', () => {
    it('should convert to uppercase', () => {
      expect(normalizeSymbol('btc')).toBe('BTC');
    });

    it('should trim whitespace', () => {
      expect(normalizeSymbol('  BTC  ')).toBe('BTC');
    });

    it('should handle null', () => {
      expect(normalizeSymbol(null)).toBe('');
    });

    it('should handle undefined', () => {
      expect(normalizeSymbol(undefined)).toBe('');
    });
  });

  describe('normalizeNetwork', () => {
    it('should convert to lowercase', () => {
      expect(normalizeNetwork('BSC')).toBe('bsc');
    });

    it('should handle null', () => {
      expect(normalizeNetwork(null)).toBe('');
    });

    it('should handle undefined', () => {
      expect(normalizeNetwork(undefined)).toBe('');
    });
  });

  describe('matchesToken', () => {
    const token: Token = { symbol: 'BTC', chain: 'solana' };
    const row: StraightData = {
      token: 'BTC',
      network: 'solana',
      aExchange: 'jupiter',
      bExchange: 'mexc',
      priceA: '100',
      priceB: '101',
      spread: '1',
      limit: '1000',
    };

    it('should match token and row', () => {
      expect(matchesToken(row, token)).toBe(true);
    });

    it('should not match different symbol', () => {
      expect(matchesToken({ ...row, token: 'ETH' }, token)).toBe(false);
    });

    it('should not match different network', () => {
      expect(matchesToken({ ...row, network: 'bsc' }, token)).toBe(false);
    });
  });

  describe('filterByToken', () => {
    const token: Token = { symbol: 'BTC', chain: 'solana' };
    const rows: StraightData[] = [
      {
        token: 'BTC',
        network: 'solana',
        aExchange: 'jupiter',
        bExchange: 'mexc',
        priceA: '100',
        priceB: '101',
        spread: '1',
        limit: '1000',
      },
      {
        token: 'ETH',
        network: 'solana',
        aExchange: 'jupiter',
        bExchange: 'mexc',
        priceA: '200',
        priceB: '201',
        spread: '1',
        limit: '2000',
      },
    ];

    it('should filter rows by token', () => {
      const result = filterByToken(rows, token);
      expect(result).toHaveLength(1);
      expect(result[0]?.token).toBe('BTC');
    });
  });

  describe('filterBySymbolAndNetwork', () => {
    const rows: StraightData[] = [
      {
        token: 'BTC',
        network: 'solana',
        aExchange: 'jupiter',
        bExchange: 'mexc',
        priceA: '100',
        priceB: '101',
        spread: '1',
        limit: '1000',
      },
      {
        token: 'BTC',
        network: 'bsc',
        aExchange: 'jupiter',
        bExchange: 'mexc',
        priceA: '100',
        priceB: '101',
        spread: '1',
        limit: '1000',
      },
    ];

    it('should filter by symbol and network', () => {
      const result = filterBySymbolAndNetwork(rows, 'BTC', 'solana');
      expect(result).toHaveLength(1);
      expect(result[0]?.network).toBe('solana');
    });
  });

  describe('extractValidPrices', () => {
    it('should extract valid prices', () => {
      const row: StraightData = {
        token: 'BTC',
        network: 'solana',
        aExchange: 'jupiter',
        bExchange: 'mexc',
        priceA: '100',
        priceB: '101',
        spread: '1',
        limit: '1000',
      };
      const prices = extractValidPrices(row);
      expect(prices).toEqual([100, 101]);
    });

    it('should skip invalid prices', () => {
      const row: StraightData = {
        token: 'BTC',
        network: 'solana',
        aExchange: 'jupiter',
        bExchange: 'mexc',
        priceA: '0',
        priceB: '-1',
        spread: '1',
        limit: '1000',
      };
      const prices = extractValidPrices(row);
      expect(prices).toEqual([]);
    });

    it('should handle missing prices', () => {
      const row: Partial<StraightData> = {
        token: 'BTC',
        network: 'solana',
        aExchange: 'jupiter',
        bExchange: 'mexc',
        priceA: undefined,
        priceB: undefined,
        spread: '1',
        limit: '1000',
      };
      const prices = extractValidPrices(row as StraightData);
      expect(prices).toEqual([]);
    });
  });

  describe('calculateAveragePrice', () => {
    it('should calculate average price', () => {
      expect(calculateAveragePrice([100, 101, 102])).toBe(101);
    });

    it('should return null for empty array', () => {
      expect(calculateAveragePrice([])).toBeNull();
    });

    it('should handle single price', () => {
      expect(calculateAveragePrice([100])).toBe(100);
    });
  });

  describe('extractBestSpread', () => {
    it('should extract best spread', () => {
      const rows: StraightData[] = [
        {
          token: 'BTC',
          network: 'solana',
          aExchange: 'jupiter',
          bExchange: 'mexc',
          priceA: '100',
          priceB: '101',
          spread: '1',
          limit: '1000',
        },
        {
          token: 'BTC',
          network: 'solana',
          aExchange: 'jupiter',
          bExchange: 'mexc',
          priceA: '100',
          priceB: '102',
          spread: '2',
          limit: '1000',
        },
      ];
      expect(extractBestSpread(rows)).toBe(2);
    });

    it('should return null for empty array', () => {
      expect(extractBestSpread([])).toBeNull();
    });

    it('should handle invalid spreads', () => {
      const rows: Partial<StraightData>[] = [
        {
          token: 'BTC',
          network: 'solana',
          aExchange: 'jupiter',
          bExchange: 'mexc',
          priceA: '100',
          priceB: '101',
          spread: undefined,
          limit: '1000',
        },
      ];
      expect(extractBestSpread(rows as StraightData[])).toBeNull();
    });
  });
});
