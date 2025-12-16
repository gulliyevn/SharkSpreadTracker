import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getTimeframeLabel,
  getSourceLabel,
  getChainLabel,
} from '../i18n-helpers';

describe('i18n-helpers', () => {
  const mockT = vi.fn((key: string) => key);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTimeframeLabel', () => {
    it('should call t with correct key for 1m', () => {
      getTimeframeLabel('1m', mockT);
      expect(mockT).toHaveBeenCalledWith('timeframes.1m');
    });

    it('should call t with correct key for 1h', () => {
      getTimeframeLabel('1h', mockT);
      expect(mockT).toHaveBeenCalledWith('timeframes.1h');
    });

    it('should return translated label', () => {
      mockT.mockReturnValue('1 час');
      const result = getTimeframeLabel('1h', mockT);
      expect(result).toBe('1 час');
    });
  });

  describe('getSourceLabel', () => {
    it('should call t with correct key for mexc', () => {
      getSourceLabel('mexc', mockT);
      expect(mockT).toHaveBeenCalledWith('sources.mexc');
    });

    it('should call t with correct key for jupiter', () => {
      getSourceLabel('jupiter', mockT);
      expect(mockT).toHaveBeenCalledWith('sources.jupiter');
    });

    it('should return translated label', () => {
      mockT.mockReturnValue('MEXC Exchange');
      const result = getSourceLabel('mexc', mockT);
      expect(result).toBe('MEXC Exchange');
    });
  });

  describe('getChainLabel', () => {
    it('should call t with correct key for solana', () => {
      getChainLabel('solana', mockT);
      expect(mockT).toHaveBeenCalledWith('chains.solana');
    });

    it('should call t with correct key for bsc', () => {
      getChainLabel('bsc', mockT);
      expect(mockT).toHaveBeenCalledWith('chains.bsc');
    });

    it('should return translated label', () => {
      mockT.mockReturnValue('Solana Network');
      const result = getChainLabel('solana', mockT);
      expect(result).toBe('Solana Network');
    });
  });
});

