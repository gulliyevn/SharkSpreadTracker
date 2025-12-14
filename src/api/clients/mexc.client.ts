import axios, { type AxiosInstance } from 'axios';
import { SOURCE_URLS, API_CONFIG } from '@/constants/api';

/**
 * Axios клиент для MEXC API
 */
export const mexcClient: AxiosInstance = axios.create({
  baseURL: SOURCE_URLS.MEXC,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

