import { describe, it, expect } from 'vitest';
import {
  API_CONFIG,
  BACKEND_URL,
  WEBSOCKET_URL,
  REFRESH_INTERVALS,
  STORAGE_KEYS,
} from '../api';

describe('API Constants', () => {
  it('should export API_CONFIG with correct values', () => {
    expect(API_CONFIG.TIMEOUT).toBe(30000);
    expect(API_CONFIG.RETRY_ATTEMPTS).toBe(3);
    expect(API_CONFIG.RETRY_DELAY).toBe(1000);
  });

  it('should export BACKEND_URL', () => {
    // Проверяем что BACKEND_URL определен (может быть пустой строкой или URL)
    expect(typeof BACKEND_URL).toBe('string');
  });

  it('should export WEBSOCKET_URL', () => {
    // Проверяем что WEBSOCKET_URL определен (может быть пустой строкой или URL)
    expect(typeof WEBSOCKET_URL).toBe('string');
  });

  it('should export REFRESH_INTERVALS with correct values', () => {
    expect(REFRESH_INTERVALS.SPREAD_DATA).toBe(3000); // 3 секунды
    expect(REFRESH_INTERVALS.TOKENS).toBe(15000); // 15 секунд
  });

  it('should export STORAGE_KEYS with correct values', () => {
    expect(STORAGE_KEYS.API_KEY).toBe('shark_api_key');
    expect(STORAGE_KEYS.SELECTED_TOKEN).toBe('shark_selected_token');
    expect(STORAGE_KEYS.SELECTED_TIMEFRAME).toBe('shark_selected_timeframe');
    expect(STORAGE_KEYS.SELECTED_SOURCES).toBe('shark_selected_sources');
    expect(STORAGE_KEYS.THEME).toBe('shark_theme');
    expect(STORAGE_KEYS.LANGUAGE).toBe('i18nextLng');
  });
});
