/**
 * Утилита для валидации API ключей при запуске приложения
 */

export interface ApiKeyStatus {
  jupiter: {
    present: boolean;
    valid: boolean;
  };
  mexc: {
    present: boolean;
    valid: boolean;
  };
}

/**
 * Проверить наличие и валидность API ключей из переменных окружения
 */
export function validateApiKeys(): ApiKeyStatus {
  const jupiterKey = import.meta.env.VITE_JUPITER_API_KEY;
  const mexcKey = import.meta.env.VITE_MEXC_API_KEY;

  return {
    jupiter: {
      present: !!jupiterKey,
      valid: !!jupiterKey && jupiterKey.trim().length >= 10,
    },
    mexc: {
      present: !!mexcKey,
      valid: !!mexcKey && mexcKey.trim().length >= 10,
    },
  };
}

/**
 * Получить список отсутствующих API ключей
 */
export function getMissingApiKeys(): string[] {
  const status = validateApiKeys();
  const missing: string[] = [];

  if (!status.jupiter.present) {
    missing.push('Jupiter (VITE_JUPITER_API_KEY)');
  }
  if (!status.mexc.present) {
    missing.push('MEXC (VITE_MEXC_API_KEY)');
  }

  return missing;
}

/**
 * Получить список невалидных API ключей
 */
export function getInvalidApiKeys(): string[] {
  const status = validateApiKeys();
  const invalid: string[] = [];

  if (status.jupiter.present && !status.jupiter.valid) {
    invalid.push('Jupiter (VITE_JUPITER_API_KEY)');
  }
  if (status.mexc.present && !status.mexc.valid) {
    invalid.push('MEXC (VITE_MEXC_API_KEY)');
  }

  return invalid;
}

/**
 * Проверить, нужны ли API ключи для работы приложения
 * (некоторые API могут работать без ключей, но с ограничениями)
 */
export function areApiKeysRequired(): boolean {
  // Jupiter API может работать без ключа, но с rate limits
  // MEXC API требует ключ для некоторых операций
  // Для базовой функциональности ключи не обязательны
  return false;
}

/**
 * Получить сообщение о статусе API ключей
 */
export function getApiKeysStatusMessage(): {
  hasWarnings: boolean;
  message: string;
} {
  const missing = getMissingApiKeys();
  const invalid = getInvalidApiKeys();

  if (missing.length === 0 && invalid.length === 0) {
    return {
      hasWarnings: false,
      message: '',
    };
  }

  const warnings: string[] = [];

  if (missing.length > 0) {
    warnings.push(`Отсутствуют API ключи: ${missing.join(', ')}`);
  }

  if (invalid.length > 0) {
    warnings.push(`Невалидные API ключи: ${invalid.join(', ')}`);
  }

  return {
    hasWarnings: true,
    message: warnings.join('. ') + '. Некоторые функции могут работать с ограничениями.',
  };
}
