import axios, { type AxiosInstance } from 'axios';
import { SOURCE_URLS, API_CONFIG } from '@/constants/api';

/**
 * Axios клиент для PancakeSwap/DexScreener API
 */
export const pancakeClient: AxiosInstance = axios.create({
  baseURL: SOURCE_URLS.PANCAKE,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});
