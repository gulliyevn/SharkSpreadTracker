import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validateApiKeys,
  getMissingApiKeys,
  getInvalidApiKeys,
  areApiKeysRequired,
  getApiKeysStatusMessage,
} from '../api-keys-validator';

describe('api-keys-validator', () => {
  beforeEach(() => {
    // Сбрасываем env переменные перед каждым тестом
    vi.stubEnv('VITE_JUPITER_API_KEY', '');
    vi.stubEnv('VITE_MEXC_API_KEY', '');
  });

  describe('validateApiKeys', () => {
    it('should return false for both keys when they are not set', () => {
      const result = validateApiKeys();

      expect(result.jupiter.present).toBe(false);
      expect(result.jupiter.valid).toBe(false);
      expect(result.mexc.present).toBe(false);
      expect(result.mexc.valid).toBe(false);
    });

    it('should return true for present when key is set', () => {
      vi.stubEnv('VITE_JUPITER_API_KEY', 'test-key-12345');
      vi.stubEnv('VITE_MEXC_API_KEY', 'test-key-67890');

      const result = validateApiKeys();

      expect(result.jupiter.present).toBe(true);
      expect(result.mexc.present).toBe(true);
    });

    it('should return false for valid when key is too short', () => {
      vi.stubEnv('VITE_JUPITER_API_KEY', 'short');
      vi.stubEnv('VITE_MEXC_API_KEY', 'key');

      const result = validateApiKeys();

      expect(result.jupiter.present).toBe(true);
      expect(result.jupiter.valid).toBe(false);
      expect(result.mexc.present).toBe(true);
      expect(result.mexc.valid).toBe(false);
    });

    it('should return true for valid when key is long enough', () => {
      vi.stubEnv('VITE_JUPITER_API_KEY', 'valid-key-12345');
      vi.stubEnv('VITE_MEXC_API_KEY', 'valid-key-67890');

      const result = validateApiKeys();

      expect(result.jupiter.valid).toBe(true);
      expect(result.mexc.valid).toBe(true);
    });

    it('should trim whitespace when validating key length', () => {
      vi.stubEnv('VITE_JUPITER_API_KEY', '  valid-key-12345  ');
      vi.stubEnv('VITE_MEXC_API_KEY', '  valid-key-67890  ');

      const result = validateApiKeys();

      expect(result.jupiter.valid).toBe(true);
      expect(result.mexc.valid).toBe(true);
    });

    it('should handle exactly 10 character keys', () => {
      vi.stubEnv('VITE_JUPITER_API_KEY', '1234567890');
      vi.stubEnv('VITE_MEXC_API_KEY', 'abcdefghij');

      const result = validateApiKeys();

      expect(result.jupiter.valid).toBe(true);
      expect(result.mexc.valid).toBe(true);
    });

    it('should handle keys with only whitespace', () => {
      vi.stubEnv('VITE_JUPITER_API_KEY', '   ');
      vi.stubEnv('VITE_MEXC_API_KEY', '\t\n');

      const result = validateApiKeys();

      expect(result.jupiter.present).toBe(true);
      expect(result.jupiter.valid).toBe(false);
      expect(result.mexc.present).toBe(true);
      expect(result.mexc.valid).toBe(false);
    });
  });

  describe('getMissingApiKeys', () => {
    it('should return both keys when both are missing', () => {
      const missing = getMissingApiKeys();

      expect(missing).toHaveLength(2);
      expect(missing).toContain('Jupiter (VITE_JUPITER_API_KEY)');
      expect(missing).toContain('MEXC (VITE_MEXC_API_KEY)');
    });

    it('should return only Jupiter when MEXC is present', () => {
      vi.stubEnv('VITE_MEXC_API_KEY', 'valid-key-12345');

      const missing = getMissingApiKeys();

      expect(missing).toHaveLength(1);
      expect(missing).toContain('Jupiter (VITE_JUPITER_API_KEY)');
      expect(missing).not.toContain('MEXC (VITE_MEXC_API_KEY)');
    });

    it('should return only MEXC when Jupiter is present', () => {
      vi.stubEnv('VITE_JUPITER_API_KEY', 'valid-key-12345');

      const missing = getMissingApiKeys();

      expect(missing).toHaveLength(1);
      expect(missing).toContain('MEXC (VITE_MEXC_API_KEY)');
      expect(missing).not.toContain('Jupiter (VITE_JUPITER_API_KEY)');
    });

    it('should return empty array when both keys are present', () => {
      vi.stubEnv('VITE_JUPITER_API_KEY', 'valid-key-12345');
      vi.stubEnv('VITE_MEXC_API_KEY', 'valid-key-67890');

      const missing = getMissingApiKeys();

      expect(missing).toHaveLength(0);
    });
  });

  describe('getInvalidApiKeys', () => {
    it('should return empty array when no keys are set', () => {
      const invalid = getInvalidApiKeys();

      expect(invalid).toHaveLength(0);
    });

    it('should return empty array when both keys are valid', () => {
      vi.stubEnv('VITE_JUPITER_API_KEY', 'valid-key-12345');
      vi.stubEnv('VITE_MEXC_API_KEY', 'valid-key-67890');

      const invalid = getInvalidApiKeys();

      expect(invalid).toHaveLength(0);
    });

    it('should return Jupiter when it is present but invalid', () => {
      vi.stubEnv('VITE_JUPITER_API_KEY', 'short');
      vi.stubEnv('VITE_MEXC_API_KEY', 'valid-key-67890');

      const invalid = getInvalidApiKeys();

      expect(invalid).toHaveLength(1);
      expect(invalid).toContain('Jupiter (VITE_JUPITER_API_KEY)');
    });

    it('should return MEXC when it is present but invalid', () => {
      vi.stubEnv('VITE_JUPITER_API_KEY', 'valid-key-12345');
      vi.stubEnv('VITE_MEXC_API_KEY', 'short');

      const invalid = getInvalidApiKeys();

      expect(invalid).toHaveLength(1);
      expect(invalid).toContain('MEXC (VITE_MEXC_API_KEY)');
    });

    it('should return both when both are present but invalid', () => {
      vi.stubEnv('VITE_JUPITER_API_KEY', 'short1');
      vi.stubEnv('VITE_MEXC_API_KEY', 'short2');

      const invalid = getInvalidApiKeys();

      expect(invalid).toHaveLength(2);
      expect(invalid).toContain('Jupiter (VITE_JUPITER_API_KEY)');
      expect(invalid).toContain('MEXC (VITE_MEXC_API_KEY)');
    });
  });

  describe('areApiKeysRequired', () => {
    it('should always return false', () => {
      expect(areApiKeysRequired()).toBe(false);

      vi.stubEnv('VITE_JUPITER_API_KEY', 'valid-key-12345');
      vi.stubEnv('VITE_MEXC_API_KEY', 'valid-key-67890');

      expect(areApiKeysRequired()).toBe(false);
    });
  });

  describe('getApiKeysStatusMessage', () => {
    it('should return no warnings when all keys are valid', () => {
      vi.stubEnv('VITE_JUPITER_API_KEY', 'valid-key-12345');
      vi.stubEnv('VITE_MEXC_API_KEY', 'valid-key-67890');

      const status = getApiKeysStatusMessage();

      expect(status.hasWarnings).toBe(false);
      expect(status.message).toBe('');
    });

    it('should return warnings when keys are missing', () => {
      const status = getApiKeysStatusMessage();

      expect(status.hasWarnings).toBe(true);
      expect(status.message).toContain('Отсутствуют API ключи');
      expect(status.message).toContain('Jupiter');
      expect(status.message).toContain('MEXC');
    });

    it('should return warnings when keys are invalid', () => {
      vi.stubEnv('VITE_JUPITER_API_KEY', 'short');
      vi.stubEnv('VITE_MEXC_API_KEY', 'key');

      const status = getApiKeysStatusMessage();

      expect(status.hasWarnings).toBe(true);
      expect(status.message).toContain('Невалидные API ключи');
      expect(status.message).toContain('Jupiter');
      expect(status.message).toContain('MEXC');
    });

    it('should return warnings for both missing and invalid keys', () => {
      vi.stubEnv('VITE_JUPITER_API_KEY', 'short');

      const status = getApiKeysStatusMessage();

      expect(status.hasWarnings).toBe(true);
      expect(status.message).toContain('Отсутствуют API ключи');
      expect(status.message).toContain('Невалидные API ключи');
      expect(status.message).toContain('Некоторые функции могут работать с ограничениями');
    });

    it('should include hint about limitations in message', () => {
      const status = getApiKeysStatusMessage();

      expect(status.message).toContain('Некоторые функции могут работать с ограничениями');
    });
  });
});
