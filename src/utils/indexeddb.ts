/**
 * IndexedDB утилиты для хранения истории спредов
 * Заменяет localStorage для больших объемов данных
 */

import { logger } from './logger';
import type { SpreadDataPoint, Token, TimeframeOption } from '@/types';

const DB_NAME = 'SharkSpreadTrackerDB';
const DB_VERSION = 1;
const STORE_NAME = 'spreadHistory';

interface SpreadHistoryRecord {
  id: string; // `${token.symbol}-${token.chain}-${timeframe}`
  token: Token;
  timeframe: TimeframeOption;
  data: SpreadDataPoint[];
  createdAt: number;
  updatedAt: number;
  expiresAt: number; // TTL для автоматической очистки
}

class IndexedDBManager {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Инициализация базы данных
   */
  async init(): Promise<void> {
    if (this.db) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        logger.warn('IndexedDB is not available, falling back to localStorage');
        resolve();
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        logger.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        logger.info('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Создаем object store если его нет
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
          });
          // Индекс для поиска по expiresAt (для очистки старых данных)
          objectStore.createIndex('expiresAt', 'expiresAt', { unique: false });
          // Индекс для поиска по token и timeframe
          objectStore.createIndex(
            'token-timeframe',
            ['token.symbol', 'token.chain', 'timeframe'],
            {
              unique: false,
            }
          );
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Проверить, доступен ли IndexedDB
   */
  isAvailable(): boolean {
    return typeof window !== 'undefined' && !!window.indexedDB && !!this.db;
  }

  /**
   * Получить базу данных (с инициализацией если нужно)
   */
  private async getDB(): Promise<IDBDatabase> {
    await this.init();
    if (!this.db) {
      throw new Error('IndexedDB is not available');
    }
    return this.db;
  }

  /**
   * Сохранить историю спреда
   */
  async saveSpreadHistory(
    token: Token,
    timeframe: TimeframeOption,
    data: SpreadDataPoint[]
  ): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('IndexedDB is not available');
    }

    try {
      const db = await this.getDB();
      const id = `${token.symbol}-${token.chain}-${timeframe}`;
      const now = Date.now();

      // Вычисляем TTL на основе таймфрейма (храним данные на 2x дольше чем максимальный период)
      const timeframeMinutes = this.getTimeframeMinutes(timeframe);
      const maxAge = timeframeMinutes * 60 * 1000 * 2; // 2x период для запаса
      const expiresAt = now + maxAge;

      const record: SpreadHistoryRecord = {
        id,
        token,
        timeframe,
        data,
        createdAt: now,
        updatedAt: now,
        expiresAt,
      };

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(record);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          logger.error(
            'Failed to save spread history to IndexedDB:',
            request.error
          );
          reject(request.error);
        };
      });
    } catch (error) {
      logger.error('Error saving spread history to IndexedDB:', error);
      throw error;
    }
  }

  /**
   * Загрузить историю спреда
   */
  async loadSpreadHistory(
    token: Token,
    timeframe: TimeframeOption
  ): Promise<SpreadDataPoint[]> {
    if (!this.isAvailable()) {
      throw new Error('IndexedDB is not available');
    }

    try {
      const db = await this.getDB();
      const id = `${token.symbol}-${token.chain}-${timeframe}`;

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => {
          const record = request.result as SpreadHistoryRecord | undefined;

          if (!record) {
            resolve([]);
            return;
          }

          // Проверяем TTL
          if (record.expiresAt < Date.now()) {
            // Данные устарели, удаляем их
            this.deleteSpreadHistory(token, timeframe).catch((err) => {
              logger.error('Failed to delete expired data:', err);
            });
            resolve([]);
            return;
          }

          resolve(record.data || []);
        };

        request.onerror = () => {
          logger.error(
            'Failed to load spread history from IndexedDB:',
            request.error
          );
          reject(request.error);
        };
      });
    } catch (error) {
      logger.error('Error loading spread history from IndexedDB:', error);
      throw error;
    }
  }

  /**
   * Удалить историю спреда
   */
  async deleteSpreadHistory(
    token: Token,
    timeframe?: TimeframeOption
  ): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('IndexedDB is not available');
    }

    try {
      const db = await this.getDB();

      if (timeframe) {
        const id = `${token.symbol}-${token.chain}-${timeframe}`;
        return new Promise((resolve, reject) => {
          const transaction = db.transaction([STORE_NAME], 'readwrite');
          const store = transaction.objectStore(STORE_NAME);
          const request = store.delete(id);

          request.onsuccess = () => {
            resolve();
          };

          request.onerror = () => {
            logger.error(
              'Failed to delete spread history from IndexedDB:',
              request.error
            );
            reject(request.error);
          };
        });
      } else {
        // Удаляем все таймфреймы для токена
        const timeframes: TimeframeOption[] = [
          '1m',
          '5m',
          '15m',
          '1h',
          '4h',
          '1d',
        ];
        const promises = timeframes.map((tf) =>
          this.deleteSpreadHistory(token, tf)
        );
        await Promise.all(promises);
      }
    } catch (error) {
      logger.error('Error deleting spread history from IndexedDB:', error);
      throw error;
    }
  }

  /**
   * Очистить устаревшие данные (TTL)
   */
  async cleanupExpiredData(): Promise<number> {
    if (!this.isAvailable()) {
      return 0;
    }

    try {
      const db = await this.getDB();
      const now = Date.now();
      let deletedCount = 0;

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('expiresAt');

        // Получаем все записи с expiresAt <= now
        const range = IDBKeyRange.upperBound(now);
        const request = index.openCursor(range);

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>)
            .result;
          if (cursor) {
            cursor.delete();
            deletedCount++;
            cursor.continue();
          } else {
            logger.info(
              `Cleaned up ${deletedCount} expired records from IndexedDB`
            );
            resolve(deletedCount);
          }
        };

        request.onerror = () => {
          logger.error(
            'Failed to cleanup expired data from IndexedDB:',
            request.error
          );
          reject(request.error);
        };
      });
    } catch (error) {
      logger.error('Error cleaning up expired data from IndexedDB:', error);
      return 0;
    }
  }

  /**
   * Мигрировать данные из localStorage в IndexedDB
   */
  async migrateFromLocalStorage(): Promise<number> {
    if (!this.isAvailable()) {
      return 0;
    }

    try {
      let migratedCount = 0;

      // Получаем все ключи из localStorage
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('spread-history-')) {
          keys.push(key);
        }
      }

      // Мигрируем каждый ключ
      for (const key of keys) {
        try {
          const stored = localStorage.getItem(key);
          if (!stored) continue;

          const data = JSON.parse(stored) as SpreadDataPoint[];
          if (!Array.isArray(data) || data.length === 0) continue;

          // Парсим ключ: spread-history-{symbol}-{chain}-{timeframe}
          const parts = key.replace('spread-history-', '').split('-');
          if (parts.length < 3) continue;

          const timeframe = parts[parts.length - 1] as TimeframeOption;
          const chain = parts[parts.length - 2] as 'solana' | 'bsc';
          const symbol = parts.slice(0, -2).join('-');

          const token: Token = { symbol, chain };

          // Сохраняем в IndexedDB
          await this.saveSpreadHistory(token, timeframe, data);

          // Удаляем из localStorage после успешной миграции
          localStorage.removeItem(key);
          migratedCount++;

          logger.debug(`Migrated ${key} from localStorage to IndexedDB`);
        } catch (error) {
          logger.warn(`Failed to migrate ${key} from localStorage:`, error);
        }
      }

      if (migratedCount > 0) {
        logger.info(
          `Migrated ${migratedCount} records from localStorage to IndexedDB`
        );
      }

      return migratedCount;
    } catch (error) {
      logger.error(
        'Error migrating data from localStorage to IndexedDB:',
        error
      );
      return 0;
    }
  }

  /**
   * Получить количество минут для таймфрейма
   */
  private getTimeframeMinutes(timeframe: TimeframeOption): number {
    const timeframeMap: Record<TimeframeOption, number> = {
      '1m': 1,
      '5m': 5,
      '15m': 15,
      '1h': 60,
      '4h': 240,
      '1d': 1440,
    };
    return timeframeMap[timeframe];
  }

  /**
   * Получить размер базы данных (приблизительно)
   */
  async getDatabaseSize(): Promise<number> {
    if (!this.isAvailable()) {
      return 0;
    }

    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          const records = request.result as SpreadHistoryRecord[];
          const size = JSON.stringify(records).length;
          resolve(size);
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (error) {
      logger.error('Error getting database size:', error);
      return 0;
    }
  }
}

// Singleton экземпляр
export const indexedDBManager = new IndexedDBManager();

// Автоматическая инициализация и миграция при загрузке модуля
if (typeof window !== 'undefined') {
  indexedDBManager
    .init()
    .then(() => {
      // Мигрируем данные из localStorage при первой загрузке
      return indexedDBManager.migrateFromLocalStorage();
    })
    .then(() => {
      // Очищаем устаревшие данные при загрузке
      return indexedDBManager.cleanupExpiredData();
    })
    .catch((error) => {
      logger.error('Failed to initialize IndexedDB:', error);
    });
}
