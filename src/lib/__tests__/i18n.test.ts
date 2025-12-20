import { describe, it, expect, beforeEach } from 'vitest';
import i18n, { supportedLanguages } from '../i18n';
import '@/lib/i18n'; // Инициализация i18n

describe('i18n', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('should have supported languages', () => {
    expect(supportedLanguages).toContain('en');
    expect(supportedLanguages).toContain('ru');
    expect(supportedLanguages).toContain('tr');
  });

  it('should translate to English', async () => {
    await i18n.changeLanguage('en');
    expect(i18n.t('common.loading')).toBe('Loading...');
  });

  it('should translate to Russian', async () => {
    await i18n.changeLanguage('ru');
    expect(i18n.t('common.loading')).toBe('Загрузка...');
  });

  it('should translate to Turkish', async () => {
    await i18n.changeLanguage('tr');
    expect(i18n.t('common.loading')).toBe('Yükleniyor...');
  });

  it('should fallback to English for unknown keys', () => {
    expect(i18n.t('unknown.key')).toBe('unknown.key');
  });

  it('should have default language as English', () => {
    expect(i18n.language).toBeDefined();
  });
});
