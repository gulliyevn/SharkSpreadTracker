import { describe, it, expect } from 'vitest';
import { CHAINS, CHAIN_IDS, getChainConfig } from '../chains';

describe('chains', () => {
  describe('CHAINS', () => {
    it('should have solana and bsc chains', () => {
      expect(CHAINS.solana).toBeDefined();
      expect(CHAINS.bsc).toBeDefined();
    });

    it('should have correct structure for solana', () => {
      expect(CHAINS.solana).toEqual({
        id: 'solana',
        label: 'Solana',
        emoji: '🟣',
      });
    });

    it('should have correct structure for bsc', () => {
      expect(CHAINS.bsc).toEqual({
        id: 'bsc',
        label: 'BSC',
        emoji: '🟡',
      });
    });
  });

  describe('CHAIN_IDS', () => {
    it('should have BSC chain IDs', () => {
      expect(CHAIN_IDS.BSC).toEqual(['bsc', '56']);
    });

    it('should have SOLANA chain IDs', () => {
      expect(CHAIN_IDS.SOLANA).toEqual(['solana', 'sol']);
    });
  });

  describe('getChainConfig', () => {
    it('should return correct config for solana', () => {
      const config = getChainConfig('solana');
      expect(config.id).toBe('solana');
      expect(config.label).toBe('Solana');
      expect(config.emoji).toBe('🟣');
    });

    it('should return correct config for bsc', () => {
      const config = getChainConfig('bsc');
      expect(config.id).toBe('bsc');
      expect(config.label).toBe('BSC');
      expect(config.emoji).toBe('🟡');
    });
  });
});

