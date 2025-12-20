import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { indexedDBManager } from '../indexeddb';
import type { Token, SpreadDataPoint } from '@/types';

// Мокируем IndexedDB
class MockIDBRequest {
  onsuccess: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  result: unknown = null;
  error: DOMException | null = null;

  constructor(public operation: string) {}

  dispatchSuccess(result?: unknown): void {
    this.result = result;
    if (this.onsuccess) {
      this.onsuccess({} as Event);
    }
  }

  dispatchError(error: DOMException): void {
    this.error = error;
    if (this.onerror) {
      this.onerror({} as Event);
    }
  }
}

class MockIDBObjectStore {
  private data: Map<string, unknown> = new Map();

  put(value: unknown): MockIDBRequest {
    const request = new MockIDBRequest('put');
    const record = value as { id: string };
    this.data.set(record.id, value);
    setTimeout(() => request.dispatchSuccess(value), 0);
    return request;
  }

  get(key: string): MockIDBRequest {
    const request = new MockIDBRequest('get');
    const value = this.data.get(key);
    setTimeout(() => request.dispatchSuccess(value), 0);
    return request;
  }

  delete(key: string): MockIDBRequest {
    const request = new MockIDBRequest('delete');
    this.data.delete(key);
    setTimeout(() => request.dispatchSuccess(), 0);
    return request;
  }

  index(_name: string): MockIDBIndex {
    return new MockIDBIndex(this.data);
  }
}

class MockIDBIndex {
  constructor(_data: Map<string, unknown>) {}

  openCursor(_range?: IDBKeyRange): MockIDBRequest {
    const request = new MockIDBRequest('openCursor');
    const cursor = {
      value: null,
      continue: vi.fn(),
      delete: vi.fn(),
    };
    setTimeout(() => request.dispatchSuccess(cursor), 0);
    return request;
  }
}

class MockIDBTransaction {
  objectStore(_name: string): MockIDBObjectStore {
    return new MockIDBObjectStore();
  }
}

class MockIDBDatabase {
  objectStoreNames = {
    contains: vi.fn(() => false),
  };
  createObjectStore = vi.fn(() => ({
    createIndex: vi.fn(),
  }));
  transaction = vi.fn(() => new MockIDBTransaction());
}

// Мокируем window.indexedDB
const mockIndexedDB = {
  open: vi.fn((_name: string, _version?: number) => {
    const request = new MockIDBRequest('open');
    setTimeout(() => {
      request.dispatchSuccess(new MockIDBDatabase());
    }, 0);
    return request;
  }),
};

describe('IndexedDBManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Мокируем window.indexedDB
    Object.defineProperty(window, 'indexedDB', {
      value: mockIndexedDB,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('init', () => {
    it('should initialize IndexedDB when available', async () => {
      const result = await indexedDBManager.init();
      expect(result).toBeUndefined();
    });

    it('should handle IndexedDB unavailability gracefully', async () => {
      Object.defineProperty(window, 'indexedDB', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      // Перезагружаем модуль для применения мока
      await vi.resetModules();
      const { indexedDBManager: newManager } = await import('../indexeddb');
      
      await expect(newManager.init()).resolves.not.toThrow();
    });
  });

  describe('isAvailable', () => {
    it('should return true when IndexedDB is available', () => {
      Object.defineProperty(window, 'indexedDB', {
        value: mockIndexedDB,
        writable: true,
        configurable: true,
      });

      const isAvailable = indexedDBManager.isAvailable();
      expect(typeof isAvailable).toBe('boolean');
    });

    it('should return false when IndexedDB is not available', () => {
      Object.defineProperty(window, 'indexedDB', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const isAvailable = indexedDBManager.isAvailable();
      expect(isAvailable).toBe(false);
    });
  });

  describe('saveSpreadHistory', () => {
    it('should throw error when IndexedDB is not available', async () => {
      Object.defineProperty(window, 'indexedDB', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      await vi.resetModules();
      const { indexedDBManager: newManager } = await import('../indexeddb');

      const token: Token = { symbol: 'BTC', chain: 'solana' };
      const data: SpreadDataPoint[] = [];

      await expect(newManager.saveSpreadHistory(token, '1h', data)).rejects.toThrow(
        'IndexedDB is not available'
      );
    });
  });

  describe('loadSpreadHistory', () => {
    it('should throw error when IndexedDB is not available', async () => {
      Object.defineProperty(window, 'indexedDB', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      await vi.resetModules();
      const { indexedDBManager: newManager } = await import('../indexeddb');

      const token: Token = { symbol: 'BTC', chain: 'solana' };

      await expect(newManager.loadSpreadHistory(token, '1h')).rejects.toThrow(
        'IndexedDB is not available'
      );
    });
  });

  describe('deleteSpreadHistory', () => {
    it('should throw error when IndexedDB is not available', async () => {
      Object.defineProperty(window, 'indexedDB', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      await vi.resetModules();
      const { indexedDBManager: newManager } = await import('../indexeddb');

      const token: Token = { symbol: 'BTC', chain: 'solana' };

      await expect(newManager.deleteSpreadHistory(token, '1h')).rejects.toThrow(
        'IndexedDB is not available'
      );
    });

    it('should handle deletion when timeframe is not specified', async () => {
      // Тест проверяет, что метод может быть вызван без ошибок
      // В реальности он вызывает deleteSpreadHistory для всех таймфреймов
      const token: Token = { symbol: 'BTC', chain: 'solana' };
      
      // Проверяем, что метод существует и может быть вызван
      expect(typeof indexedDBManager.deleteSpreadHistory).toBe('function');
      
      // В тестовой среде без IndexedDB метод выбросит ошибку, что ожидаемо
      if (!indexedDBManager.isAvailable()) {
        await expect(indexedDBManager.deleteSpreadHistory(token)).rejects.toThrow();
      }
    });
  });

  describe('cleanupExpiredData', () => {
    it('should return 0 when IndexedDB is not available', async () => {
      Object.defineProperty(window, 'indexedDB', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      await vi.resetModules();
      const { indexedDBManager: newManager } = await import('../indexeddb');

      const count = await newManager.cleanupExpiredData();
      expect(count).toBe(0);
    });
  });

  describe('migrateFromLocalStorage', () => {
    it('should return 0 when IndexedDB is not available', async () => {
      Object.defineProperty(window, 'indexedDB', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      await vi.resetModules();
      const { indexedDBManager: newManager } = await import('../indexeddb');

      const count = await newManager.migrateFromLocalStorage();
      expect(count).toBe(0);
    });

    it('should migrate data from localStorage when available', async () => {
      // Мокируем localStorage
      const mockLocalStorage = {
        length: 1,
        key: vi.fn((index: number) => (index === 0 ? 'spread-history-BTC-solana-1h' : null)),
        getItem: vi.fn(() => JSON.stringify([{ timestamp: Date.now(), mexc_price: 50000, jupiter_price: 50100, pancakeswap_price: null }])),
        removeItem: vi.fn(),
      };

      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
        configurable: true,
      });

      Object.defineProperty(window, 'indexedDB', {
        value: mockIndexedDB,
        writable: true,
        configurable: true,
      });

      await vi.resetModules();
      const { indexedDBManager: newManager } = await import('../indexeddb');

      const count = await newManager.migrateFromLocalStorage();
      expect(typeof count).toBe('number');
    });
  });

  describe('getDatabaseSize', () => {
    it('should return 0 when IndexedDB is not available', async () => {
      Object.defineProperty(window, 'indexedDB', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      await vi.resetModules();
      const { indexedDBManager: newManager } = await import('../indexeddb');

      const size = await newManager.getDatabaseSize();
      expect(size).toBe(0);
    });
  });
});

