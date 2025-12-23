import { describe, it, expect } from 'vitest';
import {
  createJupiterSwapUrl,
  createJupiterSwapUrlWithUSDC,
  getTokenAddress,
} from '../jupiter-swap';

describe('jupiter-swap', () => {
  describe('createJupiterSwapUrl', () => {
    it('should create correct Jupiter swap URL', () => {
      const sellToken = 'So11111111111111111111111111111111111111112';
      const buyToken = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

      const url = createJupiterSwapUrl(sellToken, buyToken);

      expect(url).toContain('https://jup.ag/swap');
      expect(url).toContain('sell=');
      expect(url).toContain('buy=');
      expect(url).toContain(encodeURIComponent(sellToken));
      expect(url).toContain(encodeURIComponent(buyToken));
    });

    it('should encode special characters in token addresses', () => {
      const sellToken = 'Token&Address#Test';
      const buyToken = 'Token#Address';

      const url = createJupiterSwapUrl(sellToken, buyToken);

      // URL содержит '=' для query параметров, но токены должны быть закодированы
      expect(url).toContain('sell=');
      expect(url).toContain('buy=');
      // Проверяем, что специальные символы закодированы
      expect(url).not.toContain('Token&Address#Test');
      expect(url).not.toContain('Token#Address');
    });
  });

  describe('createJupiterSwapUrlWithUSDC', () => {
    it('should create URL for buying token with USDC', () => {
      const tokenAddress = 'So11111111111111111111111111111111111111112';

      const url = createJupiterSwapUrlWithUSDC(tokenAddress, 'buy');

      expect(url).toContain('https://jup.ag/swap');
      expect(url).toContain('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'); // USDC
      expect(url).toContain(tokenAddress);
    });

    it('should create URL for selling token for USDC', () => {
      const tokenAddress = 'So11111111111111111111111111111111111111112';

      const url = createJupiterSwapUrlWithUSDC(tokenAddress, 'sell');

      expect(url).toContain('https://jup.ag/swap');
      expect(url).toContain('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'); // USDC
      expect(url).toContain(tokenAddress);
    });

    it('should default to buy direction', () => {
      const tokenAddress = 'So11111111111111111111111111111111111111112';

      const url = createJupiterSwapUrlWithUSDC(tokenAddress);

      expect(url).toContain('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'); // USDC
    });
  });

  describe('getTokenAddress', () => {
    it('should return token address when present', () => {
      const token = { address: 'So11111111111111111111111111111111111111112' };

      const address = getTokenAddress(token);

      expect(address).toBe('So11111111111111111111111111111111111111112');
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
