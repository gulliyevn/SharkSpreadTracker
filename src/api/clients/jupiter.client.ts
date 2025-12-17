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
    ...(import.meta.env.VITE_JUPITER_API_KEY && {
      'x-api-key': import.meta.env.VITE_JUPITER_API_KEY,
    }),
  },
});
