import { useCallback } from 'react';
import { useSessionStorage } from './useSessionStorage';
import { validateApiKey } from '@/utils/validation';
import { STORAGE_KEYS } from '@/constants/api';

/**
 * Хук для безопасного хранения и управления API ключом
 * Использует sessionStorage для хранения ключа (только в рамках сессии)
 */
export function useApiKey() {
  const [apiKey, setApiKey] = useSessionStorage<string | null>(
    STORAGE_KEYS.API_KEY,
    null
  );

  /**
   * Установить API ключ
   */
  const setKey = useCallback(
    (key: string | null) => {
      if (key === null) {
        setApiKey(null);
        return;
      }

      if (!validateApiKey(key)) {
        throw new Error('Неверный формат API ключа');
      }

      setApiKey(key.trim());
    },
    [setApiKey]
  );

  /**
   * Удалить API ключ
   */
  const removeKey = useCallback(() => {
    setApiKey(null);
  }, [setApiKey]);

  /**
   * Проверить, валиден ли текущий ключ
   */
  const isValid = useCallback(() => {
    return validateApiKey(apiKey);
  }, [apiKey]);

  /**
   * Получить валидный ключ или null
   */
  const getValidKey = useCallback((): string | null => {
    return isValid() ? apiKey : null;
  }, [apiKey, isValid]);

  return {
    apiKey,
    setApiKey: setKey,
    removeApiKey: removeKey,
    isValid: isValid(),
    getValidKey,
  };
}
