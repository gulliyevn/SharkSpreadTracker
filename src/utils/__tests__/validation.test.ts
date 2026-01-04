import { describe, it, expect } from 'vitest';
import {
  validateApiKey,
  validateTokenSymbol,
  validatePrice,
  validateTimestamp,
} from '../validation';

describe('validation', () => {
  describe('validateApiKey', () => {
    it('should return false for null', () => {
      expect(validateApiKey(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(validateApiKey(undefined)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(validateApiKey('')).toBe(false);
    });

    it('should return false for short key', () => {
      expect(validateApiKey('short')).toBe(false);
    });

    it('should return true for valid key', () => {
      expect(validateApiKey('valid-api-key-12345')).toBe(true);
    });

    it('should trim whitespace', () => {
      expect(validateApiKey('  valid-key-12345  ')).toBe(true);
    });
  });

  describe('validateTokenSymbol', () => {
    it('should return false for null', () => {
      expect(validateTokenSymbol(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(validateTokenSymbol(undefined)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(validateTokenSymbol('')).toBe(false);
    });

    it('should return false for whitespace only', () => {
      expect(validateTokenSymbol('   ')).toBe(false);
    });

    it('should return true for valid symbol', () => {
      expect(validateTokenSymbol('BTC')).toBe(true);
      expect(validateTokenSymbol('ETH')).toBe(true);
      expect(validateTokenSymbol('SOL')).toBe(true);
      expect(validateTokenSymbol('CAKE')).toBe(true);
      expect(validateTokenSymbol('USDT')).toBe(true);
    });

    it('should trim whitespace', () => {
      expect(validateTokenSymbol('  SOL  ')).toBe(true);
    });

    it('should return false for numeric-only symbols', () => {
      expect(validateTokenSymbol('4')).toBe(false);
      expect(validateTokenSymbol('420')).toBe(false);
      expect(validateTokenSymbol('67')).toBe(false);
      expect(validateTokenSymbol('123')).toBe(false);
    });

    it('should return false for symbols starting with numbers and ending with USDT', () => {
      expect(validateTokenSymbol('420USDT')).toBe(false);
      expect(validateTokenSymbol('4USDT')).toBe(false);
      expect(validateTokenSymbol('67USDT')).toBe(false);
    });

    it('should return false for symbols that are too short', () => {
      expect(validateTokenSymbol('A')).toBe(false);
      expect(validateTokenSymbol('B')).toBe(false);
    });

    it('should return false for symbols that are too long', () => {
      expect(validateTokenSymbol('A'.repeat(21))).toBe(false);
      expect(validateTokenSymbol('VERYLONGSYMBOLNAME12345')).toBe(false);
    });

    it('should return true for valid symbols with numbers in the middle', () => {
      expect(validateTokenSymbol('USDC')).toBe(true);
      expect(validateTokenSymbol('WBTC')).toBe(true);
      expect(validateTokenSymbol('1INCH')).toBe(true);
    });

    it('should return false for short symbols starting with numbers and ending with few letters', () => {
      // Строка 50: /^\d+$/i.test(trimmed) - только цифры
      expect(validateTokenSymbol('100')).toBe(false);
      expect(validateTokenSymbol('420')).toBe(false);

      // Строка 56: /^\d+[A-Z]{1,2}$/i.test(trimmed) && trimmed.length <= 5
      expect(validateTokenSymbol('100X')).toBe(false); // 4 символа, начинается с цифр, заканчивается 1 буквой
      expect(validateTokenSymbol('420AB')).toBe(false); // 5 символов, начинается с цифр, заканчивается 2 буквами
      expect(validateTokenSymbol('99A')).toBe(false); // 3 символа, начинается с цифр, заканчивается 1 буквой
    });

    it('should return true for longer symbols starting with numbers', () => {
      // Длинные символы с цифрами в начале должны проходить
      expect(validateTokenSymbol('1INCH')).toBe(true); // 5 символов, но больше 5 букв
      expect(validateTokenSymbol('1000PEPE')).toBe(true); // 8 символов
      expect(validateTokenSymbol('42069MEME')).toBe(true); // 9 символов
    });
  });

  describe('validatePrice', () => {
    it('should return false for null', () => {
      expect(validatePrice(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(validatePrice(undefined)).toBe(false);
    });

    it('should return false for zero', () => {
      expect(validatePrice(0)).toBe(false);
    });

    it('should return false for negative', () => {
      expect(validatePrice(-10)).toBe(false);
    });

    it('should return false for Infinity', () => {
      expect(validatePrice(Infinity)).toBe(false);
    });

    it('should return true for positive number', () => {
      expect(validatePrice(100)).toBe(true);
    });

    it('should return true for decimal', () => {
      expect(validatePrice(0.01)).toBe(true);
    });
  });

  describe('validateTimestamp', () => {
    it('should return true for zero (epoch start)', () => {
      expect(validateTimestamp(0)).toBe(true); // 0 is valid (epoch)
    });

    it('should return false for negative', () => {
      expect(validateTimestamp(-1)).toBe(false);
    });

    it('should return false for Infinity', () => {
      expect(validateTimestamp(Infinity)).toBe(false);
    });

    it('should return true for current timestamp', () => {
      expect(validateTimestamp(Date.now())).toBe(true);
    });

    it('should return false for future timestamp (more than 1 day)', () => {
      const future = Date.now() + 2 * 24 * 60 * 60 * 1000; // +2 days
      expect(validateTimestamp(future)).toBe(false);
    });

    it('should return true for timestamp within 1 day', () => {
      const future = Date.now() + 12 * 60 * 60 * 1000; // +12 hours
      expect(validateTimestamp(future)).toBe(true);
    });

    it('should return true for past timestamp', () => {
      const past = Date.now() - 1000; // 1 second ago
      expect(validateTimestamp(past)).toBe(true);
    });

    it('should reject short symbols starting with digits and ending with letters', () => {
      // Строка 50 - это проверка для коротких символов с цифрами
      expect(validateTokenSymbol('100X')).toBe(false); // 4 символа, начинается с цифр
      expect(validateTokenSymbol('420USDT')).toBe(false); // Начинается с цифр и заканчивается на USDT
      expect(validateTokenSymbol('1INCH')).toBe(true); // Длиннее 5 символов, валидный
      expect(validateTokenSymbol('3CRV')).toBe(true); // Длиннее 5 символов, валидный
    });
  });
});
