import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  useSpreadCalculation,
  useSpreadCalculations,
  clearSpreadCalculationCache,
  type SpreadCalculationOptions,
} from '../useSpreadCalculation';
import type { CurrentData } from '@/types';

describe('useSpreadCalculation', () => {
  beforeEach(() => {
    clearSpreadCalculationCache();
    vi.clearAllMocks();
  });

  const mockCurrentData: CurrentData = {
    timestamp: Date.now(),
    mexc_price: 50000,
    jupiter_price: 50100,
    pancakeswap_price: null,
    mexc_bid: null,
    mexc_ask: null,
  };

  it('should return null when dataPoint is null', () => {
    const options: SpreadCalculationOptions = {
      source1: 'jupiter',
      source2: 'mexc',
    };

    const { result } = renderHook(() => useSpreadCalculation(null, options));

    expect(result.current).toBeNull();
  });

  it('should return null when source1 is null', () => {
    const options: SpreadCalculationOptions = {
      source1: null,
      source2: 'mexc',
    };

    const { result } = renderHook(() =>
      useSpreadCalculation(mockCurrentData, options)
    );

    expect(result.current).toBeNull();
  });

  it('should return null when source2 is null', () => {
    const options: SpreadCalculationOptions = {
      source1: 'jupiter',
      source2: null,
    };

    const { result } = renderHook(() =>
      useSpreadCalculation(mockCurrentData, options)
    );

    expect(result.current).toBeNull();
  });

  it('should calculate spread using standard algorithm', () => {
    const options: SpreadCalculationOptions = {
      source1: 'jupiter',
      source2: 'mexc',
      algorithm: 'standard',
    };

    const { result } = renderHook(() =>
      useSpreadCalculation(mockCurrentData, options)
    );

    expect(result.current).not.toBeNull();
    // directSpread: (mexc - jupiter) / jupiter * 100 = (50000 - 50100) / 50100 * 100 = -0.1996%
    expect(result.current?.directSpread).toBeCloseTo(-0.2, 1);
    // reverseSpread: (jupiter - mexc) / mexc * 100 = (50100 - 50000) / 50000 * 100 = 0.2%
    expect(result.current?.reverseSpread).toBeCloseTo(0.2, 1);
    expect(result.current?.timestamp).toBe(mockCurrentData.timestamp);
  });

  it('should calculate spread using weighted algorithm with mexc as source2', () => {
    const dataWithBidAsk: CurrentData = {
      timestamp: Date.now(),
      mexc_price: 50000,
      mexc_bid: 49950,
      mexc_ask: 50050,
      jupiter_price: 50100,
      pancakeswap_price: null,
    };

    const options: SpreadCalculationOptions = {
      source1: 'jupiter',
      source2: 'mexc',
      algorithm: 'weighted',
    };

    const { result } = renderHook(() =>
      useSpreadCalculation(dataWithBidAsk, options)
    );

    expect(result.current).not.toBeNull();
    // Используется среднее между bid и ask: (49950 + 50050) / 2 = 50000
    // directSpread: (mexc - jupiter) / jupiter * 100 = (50000 - 50100) / 50100 * 100 = -0.1996%
    expect(result.current?.directSpread).toBeCloseTo(-0.2, 1);
    // reverseSpread: (jupiter - mexc) / mexc * 100 = (50100 - 50000) / 50000 * 100 = 0.2%
    expect(result.current?.reverseSpread).toBeCloseTo(0.2, 1);
  });

  it('should calculate spread using weighted algorithm with mexc as source1', () => {
    const dataWithBidAsk: CurrentData = {
      timestamp: Date.now(),
      mexc_price: 50000,
      mexc_bid: 49950,
      mexc_ask: 50050,
      jupiter_price: 50100,
      pancakeswap_price: null,
    };

    const options: SpreadCalculationOptions = {
      source1: 'mexc',
      source2: 'jupiter',
      algorithm: 'weighted',
    };

    const { result } = renderHook(() =>
      useSpreadCalculation(dataWithBidAsk, options)
    );

    expect(result.current).not.toBeNull();
    // Используется среднее между bid и ask для mexc: (49950 + 50050) / 2 = 50000
    // directSpread: (jupiter - mexc) / mexc * 100 = (50100 - 50000) / 50000 * 100 = 0.2%
    expect(result.current?.directSpread).toBeCloseTo(0.2, 1);
    // reverseSpread: (mexc - jupiter) / jupiter * 100 = (50000 - 50100) / 50100 * 100 = -0.1996%
    expect(result.current?.reverseSpread).toBeCloseTo(-0.2, 1);
  });

  it('should calculate spread using weighted algorithm when bid or ask is null', () => {
    const dataWithPartialBidAsk: CurrentData = {
      timestamp: Date.now(),
      mexc_price: 50000,
      mexc_bid: null,
      mexc_ask: 50050,
      jupiter_price: 50100,
      pancakeswap_price: null,
    };

    const options: SpreadCalculationOptions = {
      source1: 'jupiter',
      source2: 'mexc',
      algorithm: 'weighted',
    };

    const { result } = renderHook(() =>
      useSpreadCalculation(dataWithPartialBidAsk, options)
    );

    expect(result.current).not.toBeNull();
    // Когда bid или ask null, используется mexc_price
    expect(result.current?.directSpread).toBeCloseTo(-0.2, 1);
  });

  it('should calculate spread using median algorithm', () => {
    const options: SpreadCalculationOptions = {
      source1: 'jupiter',
      source2: 'mexc',
      algorithm: 'median',
    };

    const { result } = renderHook(() =>
      useSpreadCalculation(mockCurrentData, options)
    );

    expect(result.current).not.toBeNull();
    // Median algorithm использует стандартный расчет
    expect(result.current?.directSpread).toBeCloseTo(-0.2, 1);
    expect(result.current?.reverseSpread).toBeCloseTo(0.2, 1);
  });

  it('should cache calculation results', () => {
    const options: SpreadCalculationOptions = {
      source1: 'jupiter',
      source2: 'mexc',
      cacheKey: 'test-cache-key',
    };

    const { result: result1 } = renderHook(() =>
      useSpreadCalculation(mockCurrentData, options)
    );

    const { result: result2 } = renderHook(() =>
      useSpreadCalculation(mockCurrentData, options)
    );

    // Оба результата должны быть одинаковыми (из кэша)
    expect(result1.current).toEqual(result2.current);
  });

  it('should handle null prices correctly', () => {
    const dataWithNulls: CurrentData = {
      timestamp: Date.now(),
      mexc_price: null,
      jupiter_price: null,
      pancakeswap_price: null,
      mexc_bid: null,
      mexc_ask: null,
    };

    const options: SpreadCalculationOptions = {
      source1: 'jupiter',
      source2: 'mexc',
    };

    const { result } = renderHook(() =>
      useSpreadCalculation(dataWithNulls, options)
    );

    expect(result.current).not.toBeNull();
    expect(result.current?.directSpread).toBeNull();
    expect(result.current?.reverseSpread).toBeNull();
  });

  it('should handle different source combinations', () => {
    const dataWithPancake: CurrentData = {
      timestamp: Date.now(),
      mexc_price: 50000,
      jupiter_price: null,
      pancakeswap_price: 50100,
      mexc_bid: null,
      mexc_ask: null,
    };

    const options: SpreadCalculationOptions = {
      source1: 'pancakeswap',
      source2: 'mexc',
    };

    const { result } = renderHook(() =>
      useSpreadCalculation(dataWithPancake, options)
    );

    expect(result.current).not.toBeNull();
    // directSpread: (mexc - pancakeswap) / pancakeswap * 100 = (50000 - 50100) / 50100 * 100 = -0.1996%
    expect(result.current?.directSpread).toBeCloseTo(-0.2, 1);
    // reverseSpread: (pancakeswap - mexc) / mexc * 100 = (50100 - 50000) / 50000 * 100 = 0.2%
    expect(result.current?.reverseSpread).toBeCloseTo(0.2, 1);
  });

  it('should use custom cacheKey when provided', () => {
    const options1: SpreadCalculationOptions = {
      source1: 'jupiter',
      source2: 'mexc',
      cacheKey: 'custom-key-1',
    };

    const options2: SpreadCalculationOptions = {
      source1: 'jupiter',
      source2: 'mexc',
      cacheKey: 'custom-key-2',
    };

    const { result: result1 } = renderHook(() =>
      useSpreadCalculation(mockCurrentData, options1)
    );

    const { result: result2 } = renderHook(() =>
      useSpreadCalculation(mockCurrentData, options2)
    );

    // Разные cacheKey должны давать одинаковые результаты, но не использовать кэш друг друга
    expect(result1.current).not.toBeNull();
    expect(result2.current).not.toBeNull();
    expect(result1.current?.directSpread).toBe(result2.current?.directSpread);
  });

  it('should handle default algorithm when not specified', () => {
    const options: SpreadCalculationOptions = {
      source1: 'jupiter',
      source2: 'mexc',
      // algorithm не указан, должен использоваться 'standard'
    };

    const { result } = renderHook(() =>
      useSpreadCalculation(mockCurrentData, options)
    );

    expect(result.current).not.toBeNull();
    expect(result.current?.directSpread).toBeCloseTo(-0.2, 1);
  });
});

describe('useSpreadCalculations', () => {
  const mockCurrentData: CurrentData = {
    timestamp: Date.now(),
    mexc_price: 50000,
    jupiter_price: 50100,
    pancakeswap_price: null,
    mexc_bid: null,
    mexc_ask: null,
  };

  beforeEach(() => {
    clearSpreadCalculationCache();
    vi.clearAllMocks();
  });

  it('should return empty array when dataPoints is empty', () => {
    const options: SpreadCalculationOptions = {
      source1: 'jupiter',
      source2: 'mexc',
    };

    const { result } = renderHook(() => useSpreadCalculations([], options));

    expect(result.current).toEqual([]);
  });

  it('should return empty array when source1 is null', () => {
    const options: SpreadCalculationOptions = {
      source1: null,
      source2: 'mexc',
    };

    const { result } = renderHook(() =>
      useSpreadCalculations([mockCurrentData], options)
    );

    expect(result.current).toEqual([]);
  });

  it('should calculate spreads for multiple data points', () => {
    const mockData1: CurrentData = {
      timestamp: Date.now() - 2000,
      mexc_price: 49900,
      jupiter_price: 50000,
      pancakeswap_price: null,
      mexc_bid: null,
      mexc_ask: null,
    };
    const mockData2: CurrentData = {
      timestamp: Date.now() - 1000,
      mexc_price: 50000,
      jupiter_price: 50100,
      pancakeswap_price: null,
      mexc_bid: null,
      mexc_ask: null,
    };
    const mockData3: CurrentData = {
      timestamp: Date.now(),
      mexc_price: 50100,
      jupiter_price: 50200,
      pancakeswap_price: null,
      mexc_bid: null,
      mexc_ask: null,
    };

    const dataPoints: CurrentData[] = [mockData1, mockData2, mockData3];

    const options: SpreadCalculationOptions = {
      source1: 'jupiter',
      source2: 'mexc',
    };

    const { result } = renderHook(() =>
      useSpreadCalculations(dataPoints, options)
    );

    expect(result.current).toHaveLength(3);
    // Все спреды рассчитываются как (mexc - jupiter) / jupiter * 100
    // Для первого: (49900 - 50000) / 50000 * 100 = -0.2%
    expect(result.current[0]?.directSpread).toBeCloseTo(-0.2, 1);
    // Для второго: (50000 - 50100) / 50100 * 100 = -0.1996%
    expect(result.current[1]?.directSpread).toBeCloseTo(-0.2, 1);
    // Для третьего: (50100 - 50200) / 50200 * 100 = -0.1992%
    expect(result.current[2]?.directSpread).toBeCloseTo(-0.2, 1);
  });

  it('should handle batch processing for large arrays', () => {
    const baseMockData: Omit<CurrentData, 'timestamp'> = {
      mexc_price: 50000,
      jupiter_price: 50100,
      pancakeswap_price: null,
      mexc_bid: null,
      mexc_ask: null,
    };

    const largeDataPoints: CurrentData[] = Array.from(
      { length: 150 },
      (_, i) => ({
        ...baseMockData,
        timestamp: Date.now() - (150 - i) * 1000,
        mexc_price: baseMockData.mexc_price! + i,
        jupiter_price: baseMockData.jupiter_price! + i,
      })
    );

    const options: SpreadCalculationOptions = {
      source1: 'jupiter',
      source2: 'mexc',
    };

    const { result } = renderHook(() =>
      useSpreadCalculations(largeDataPoints, options)
    );

    expect(result.current).toHaveLength(150);
    // Все спреды должны быть рассчитаны
    result.current.forEach((calc) => {
      expect(calc.directSpread).not.toBeNull();
      expect(calc.timestamp).toBeGreaterThan(0);
    });
  });

  it('should return empty array when source2 is null', () => {
    const options: SpreadCalculationOptions = {
      source1: 'jupiter',
      source2: null,
    };

    const { result } = renderHook(() =>
      useSpreadCalculations([mockCurrentData], options)
    );

    expect(result.current).toEqual([]);
  });

  it('should handle different algorithms in batch processing', () => {
    const dataPoints: CurrentData[] = [
      { ...mockCurrentData, timestamp: Date.now() - 2000 },
      { ...mockCurrentData, timestamp: Date.now() - 1000 },
      { ...mockCurrentData, timestamp: Date.now() },
    ];

    const optionsWeighted: SpreadCalculationOptions = {
      source1: 'jupiter',
      source2: 'mexc',
      algorithm: 'weighted',
    };

    const { result } = renderHook(() =>
      useSpreadCalculations(dataPoints, optionsWeighted)
    );

    expect(result.current).toHaveLength(3);
    result.current.forEach((calc) => {
      expect(calc.directSpread).not.toBeNull();
    });
  });
});

describe('clearSpreadCalculationCache', () => {
  const mockData: CurrentData = {
    timestamp: Date.now(),
    mexc_price: 50000,
    jupiter_price: 50100,
    pancakeswap_price: null,
    mexc_bid: null,
    mexc_ask: null,
  };

  it('should clear the cache', () => {
    const options: SpreadCalculationOptions = {
      source1: 'jupiter',
      source2: 'mexc',
      cacheKey: 'test-key',
    };

    // Первый вызов - сохраняет в кэш
    const { result: result1 } = renderHook(() =>
      useSpreadCalculation(mockData, options)
    );

    expect(result1.current).not.toBeNull();

    // Очищаем кэш
    clearSpreadCalculationCache();

    // Второй вызов - должен пересчитать (кэш пуст)
    const { result: result2 } = renderHook(() =>
      useSpreadCalculation(mockData, options)
    );

    // Результаты должны быть одинаковыми, но это новый расчет
    expect(result2.current).not.toBeNull();
    expect(result2.current?.directSpread).toBe(result1.current?.directSpread);
  });
});
