import axios, { type AxiosInstance } from 'axios';
import { SOURCE_URLS, API_CONFIG } from '@/constants/api';

/**
 * Axios клиент для Jupiter API
 */
export const jupiterClient: AxiosInstance = axios.create({
  baseURL: SOURCE_URLS.JUPITER,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});
