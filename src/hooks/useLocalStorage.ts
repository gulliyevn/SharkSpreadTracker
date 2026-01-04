import { useState, useEffect } from 'react';
import { logger } from '@/utils/logger';

/**
 * Хук для работы с localStorage
 * @param key - Ключ в localStorage
 * @param initialValue - Начальное значение, если ключа нет
 * @returns [value, setValue] - Текущее значение и функция для обновления
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  // Инициализация состояния
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      if (!item) {
        return initialValue;
      }
      // Пытаемся распарсить как JSON, если не получается - возвращаем как строку
      try {
        return JSON.parse(item) as T;
      } catch {
        // Если это не JSON, возвращаем как строку (для обратной совместимости)
        return item as T;
      }
    } catch (error) {
      logger.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Функция для обновления значения
  const setValue = (value: T | ((val: T) => T)) => {
    let serialized: string | null = null;
    try {
      // Поддержка функционального обновления
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        // Безопасное сохранение - проверяем размер данных
        serialized = JSON.stringify(valueToStore);
        // Ограничение размера localStorage (5MB максимум)
        if (serialized.length > 5 * 1024 * 1024) {
          logger.error(`Data too large for localStorage key "${key}"`);
          return;
        }
        window.localStorage.setItem(key, serialized);
      }
    } catch (error) {
      // Обработка ошибок QuotaExceededError и других
      if (error instanceof Error) {
        if (error.name === 'QuotaExceededError') {
          logger.error(
            `localStorage quota exceeded for key "${key}". Data size: ${serialized ? `${serialized.length} bytes` : 'unknown'}. Maximum: 5MB.`
          );
        } else if (error.name === 'SecurityError') {
          logger.error(
            `localStorage access denied for key "${key}". This may happen in private browsing mode or when cookies are disabled.`
          );
        } else {
          logger.error(
            `Error setting localStorage key "${key}": ${error.message}`,
            error
          );
        }
      } else {
        logger.error(`Unknown error setting localStorage key "${key}":`, error);
      }
    }
  };

  // Синхронизация с изменениями в других вкладках
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch (error) {
          logger.error(`Error parsing storage event for key "${key}":`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key]);

  return [storedValue, setValue];
}
