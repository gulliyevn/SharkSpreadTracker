import { describe, it, expect } from 'vitest';
import {
  createPancakeSwapUrl,
  createPancakeSwapUrlWithBUSD,
  getTokenAddress,
} from '../pancakeswap-swap';

describe('pancakeswap-swap', () => {
  describe('createPancakeSwapUrl', () => {
    it('should create correct PancakeSwap swap URL', () => {
      const tokenAddress = '0x1234567890123456789012345678901234567890';
      
      const url = createPancakeSwapUrl(tokenAddress);
      
      expect(url).toContain('https://pancakeswap.finance/swap');
      expect(url).toContain('outputCurrency=');
      expect(url).toContain(encodeURIComponent(tokenAddress));
    });

    it('should encode special characters in token addresses', () => {
      const tokenAddress = 'Token&Address#Test';
      
      const url = createPancakeSwapUrl(tokenAddress);
      
      // URL содержит '=' для query параметров, но токен должен быть закодирован
      expect(url).toContain('outputCurrency=');
      // Проверяем, что специальные символы закодированы
      expect(url).not.toContain('Token&Address#Test');
    });
  });

  describe('createPancakeSwapUrlWithBUSD', () => {
    it('should create URL for buying token with BUSD', () => {
      const tokenAddress = '0x1234567890123456789012345678901234567890';
      
      const url = createPancakeSwapUrlWithBUSD(tokenAddress, 'buy');
      
      expect(url).toContain('https://pancakeswap.finance/swap');
      expect(url).toContain('outputCurrency=');
      expect(url).toContain(tokenAddress);
    });

    it('should create URL for selling token for BUSD', () => {
      const tokenAddress = '0x1234567890123456789012345678901234567890';
      
      const url = createPancakeSwapUrlWithBUSD(tokenAddress, 'sell');
      
      expect(url).toContain('https://pancakeswap.finance/swap');
      expect(url).toContain('inputCurrency=');
      expect(url).toContain('outputCurrency=');
      expect(url).toContain('0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56'); // BUSD
      expect(url).toContain(tokenAddress);
    });

    it('should default to buy direction', () => {
      const tokenAddress = '0x1234567890123456789012345678901234567890';
      
      const url = createPancakeSwapUrlWithBUSD(tokenAddress);
      
      expect(url).toContain('outputCurrency=');
      expect(url).toContain(tokenAddress);
    });
  });

  describe('getTokenAddress', () => {
    it('should return token address when present', () => {
      const token = { address: '0x1234567890123456789012345678901234567890' };
      
      const address = getTokenAddress(token);
      
      expect(address).toBe('0x1234567890123456789012345678901234567890');
    });

    it('should return null when address is missing', () => {
      const token = {};
      
      const address = getTokenAddress(token);
      
      expect(address).toBeNull();
    });

    it('should return null when address is undefined', () => {
      const token = { address: undefined };
      
      const address = getTokenAddress(token);
      
      expect(address).toBeNull();
    });
  });
});

