import axios, { type AxiosInstance } from 'axios';
import { API_CONFIG, BACKEND_URL } from '@/constants/api';
import { logger } from '@/utils/logger';

/**
 * Axios‑клиент для общения с собственным бэкендом (backend-only режим).
 *
 * Основан на переменной окружения VITE_BACKEND_URL, например:
 *   VITE_BACKEND_URL=http://localhost:8080
 */
export const backendClient: AxiosInstance = axios.create({
  baseURL: BACKEND_URL || undefined,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
  // В dev‑режиме можно упростить CORS, если бэкенд на другом порту
  withCredentials: false,
});

if (import.meta.env.DEV) {
  if (!BACKEND_URL) {
    logger.warn(
      '[backendClient] VITE_BACKEND_URL не задан. Фронт не сможет подключиться к бэкенду.'
    );
  } else {
    logger.info('[backendClient] using BACKEND_URL:', BACKEND_URL);
  }
}
