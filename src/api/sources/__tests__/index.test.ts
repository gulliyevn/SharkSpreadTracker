import { describe, it, expect } from 'vitest';
import { createSources, getSourceById, getSourcesForChain } from '../index';

describe('sources index', () => {
  describe('createSources', () => {
    it('should create all sources', () => {
      const sources = createSources();
      expect(sources.length).toBeGreaterThan(0);
    });

    it('should include Jupiter source', () => {
      const sources = createSources();
      const jupiter = sources.find((s) => s.id === 'jupiter');
      expect(jupiter).toBeDefined();
      expect(jupiter?.name).toBe('Jupiter');
    });

    it('should include PancakeSwap source', () => {
      const sources = createSources();
      const pancake = sources.find((s) => s.id === 'pancakeswap');
      expect(pancake).toBeDefined();
      expect(pancake?.name).toBe('PancakeSwap');
    });

    it('should include MEXC source', () => {
      const sources = createSources();
      const mexc = sources.find((s) => s.id === 'mexc');
      expect(mexc).toBeDefined();
      expect(mexc?.name).toBe('MEXC');
    });
  });

  describe('getSourceById', () => {
    it('should return source by id', () => {
      const jupiter = getSourceById('jupiter');
      expect(jupiter).toBeDefined();
      expect(jupiter?.id).toBe('jupiter');
    });

    it('should return undefined for unknown id', () => {
      const unknown = getSourceById('unknown');
      expect(unknown).toBeUndefined();
    });
  });

  describe('getSourcesForChain', () => {
    it('should return sources for solana', () => {
      const sources = getSourcesForChain('solana');
      expect(sources.length).toBeGreaterThan(0);
      expect(sources.every((s) => s.supportsChain('solana'))).toBe(true);
    });

    it('should return sources for bsc', () => {
      const sources = getSourcesForChain('bsc');
      expect(sources.length).toBeGreaterThan(0);
      expect(sources.every((s) => s.supportsChain('bsc'))).toBe(true);
    });

    it('should include Jupiter for solana', () => {
      const sources = getSourcesForChain('solana');
      const jupiter = sources.find((s) => s.id === 'jupiter');
      expect(jupiter).toBeDefined();
    });

    it('should include PancakeSwap for bsc', () => {
      const sources = getSourcesForChain('bsc');
      const pancake = sources.find((s) => s.id === 'pancakeswap');
      expect(pancake).toBeDefined();
    });
  });
});

