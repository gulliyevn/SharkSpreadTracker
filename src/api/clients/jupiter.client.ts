import axios, { type AxiosInstance } from 'axios';
import { SOURCE_URLS, API_CONFIG } from '@/constants/api';

/**
 * Axios клиент для Jupiter API
 * Поддерживает API ключ через переменную окружения VITE_JUPITER_API_KEY
 */
export const jupiterClient: AxiosInstance = axios.create({
  baseURL: SOURCE_URLS.JUPITER,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    // Jupiter API требует x-api-key заголовок (не Authorization)
    // API ключ обязателен для api.jup.ag (lite-api.jup.ag deprecated)
    ...(import.meta.env.VITE_JUPITER_API_KEY && {
      'x-api-key': import.meta.env.VITE_JUPITER_API_KEY,
    }),
  },
});

// Логируем для диагностики (только в dev)
if (import.meta.env.DEV) {
  const apiKey = import.meta.env.VITE_JUPITER_API_KEY;
  if (apiKey) {
    console.log('[Jupiter Client] API key is set (length:', apiKey.length, ')');
  } else {
    console.warn('[Jupiter Client] API key (VITE_JUPITER_API_KEY) is missing!');
  }
}
