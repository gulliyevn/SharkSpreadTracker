import { useState, useEffect } from 'react';
import { logger } from '@/utils/logger';

/**
 * Хук для работы с sessionStorage
 * @param key - Ключ в sessionStorage
 * @param initialValue - Начальное значение, если ключа нет
 * @returns [value, setValue] - Текущее значение и функция для обновления
 */
export function useSessionStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.sessionStorage.getItem(key);
      if (!item) {
        return initialValue;
      }

      try {
        return JSON.parse(item) as T;
      } catch {
        return item as T;
      }
    } catch (error) {
      logger.error(`Error reading sessionStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);

      if (typeof window !== 'undefined') {
        const serialized = JSON.stringify(valueToStore);
        // sessionStorage обычно меньше по лимиту, поэтому не даём записывать большие данные
        if (serialized.length > 1024 * 1024) {
          logger.error(`Data too large for sessionStorage key "${key}"`);
          return;
        }
        window.sessionStorage.setItem(key, serialized);
      }
    } catch (error) {
      logger.error(`Error setting sessionStorage key "${key}":`, error);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.storageArea === window.sessionStorage && e.key === key) {
        if (e.newValue == null) {
          setStoredValue(initialValue);
          return;
        }
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch (error) {
          logger.error(
            `Error parsing sessionStorage event for key "${key}":`,
            error
          );
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [initialValue, key]);

  return [storedValue, setValue];
}
