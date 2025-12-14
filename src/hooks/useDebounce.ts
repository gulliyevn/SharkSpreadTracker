import { useEffect, useState } from 'react';

/**
 * Хук для debounce значения
 * @param value - Значение для debounce
 * @param delay - Задержка в миллисекундах
 * @returns Debounced значение
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

