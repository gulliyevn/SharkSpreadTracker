import { describe, it, expect } from 'vitest';
import { SOURCES, getSourceConfig, getSourcesForChain } from '../sources';

describe('sources', () => {
  describe('SOURCES', () => {
    it('should have all required sources', () => {
      expect(SOURCES.mexc).toBeDefined();
      expect(SOURCES.jupiter).toBeDefined();
      expect(SOURCES.pancakeswap).toBeDefined();
    });

    it('should have correct structure for mexc', () => {
      expect(SOURCES.mexc).toEqual({
        id: 'mexc',
        label: 'MEXC',
        emoji: '💱',
        colorTailwind: 'text-yellow-400',
        colorHex: '#fbbf24',
        chains: ['solana', 'bsc'],
        priceField: 'mexc_price',
      });
    });

    it('should have correct structure for jupiter', () => {
      expect(SOURCES.jupiter).toEqual({
        id: 'jupiter',
        label: 'Jupiter',
        emoji: '🪐',
        colorTailwind: 'text-purple-400',
        colorHex: '#a78bfa',
        chains: ['solana'],
        priceField: 'jupiter_price',
      });
    });

    it('should have correct structure for pancakeswap', () => {
      expect(SOURCES.pancakeswap).toEqual({
        id: 'pancakeswap',
        label: 'PancakeSwap',
        emoji: '🥞',
        colorTailwind: 'text-yellow-400',
        colorHex: '#facc15',
        chains: ['bsc'],
        priceField: 'pancakeswap_price',
      });
    });
  });

  describe('getSourceConfig', () => {
    it('should return correct config for mexc', () => {
      const config = getSourceConfig('mexc');
      expect(config.id).toBe('mexc');
      expect(config.label).toBe('MEXC');
    });

    it('should return correct config for jupiter', () => {
      const config = getSourceConfig('jupiter');
      expect(config.id).toBe('jupiter');
      expect(config.label).toBe('Jupiter');
    });

    it('should return correct config for pancakeswap', () => {
      const config = getSourceConfig('pancakeswap');
      expect(config.id).toBe('pancakeswap');
      expect(config.label).toBe('PancakeSwap');
    });
  });

  describe('getSourcesForChain', () => {
    it('should return all sources for solana', () => {
      const sources = getSourcesForChain('solana');
      expect(sources.length).toBe(2);
      expect(sources.map((s) => s.id)).toContain('mexc');
      expect(sources.map((s) => s.id)).toContain('jupiter');
    });

    it('should return all sources for bsc', () => {
      const sources = getSourcesForChain('bsc');
      expect(sources.length).toBe(2);
      expect(sources.map((s) => s.id)).toContain('mexc');
      expect(sources.map((s) => s.id)).toContain('pancakeswap');
    });

    it('should not include jupiter for bsc', () => {
      const sources = getSourcesForChain('bsc');
      expect(sources.map((s) => s.id)).not.toContain('jupiter');
    });

    it('should not include pancakeswap for solana', () => {
      const sources = getSourcesForChain('solana');
      expect(sources.map((s) => s.id)).not.toContain('pancakeswap');
    });
  });
});

