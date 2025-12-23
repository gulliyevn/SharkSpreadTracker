export interface Token {
  symbol: string;
  chain: 'solana' | 'bsc';
  address?: string; // Адрес токена (для Jupiter и PancakeSwap, MEXC не имеет address)
}

export type SourceType = 'mexc' | 'jupiter' | 'pancakeswap';

export interface SpreadDataPoint {
  timestamp: number;
  mexc_price: number | null;
  mexc_bid?: number | null;
  mexc_ask?: number | null;
  jupiter_price: number | null;
  pancakeswap_price: number | null;
}

export interface CurrentData {
  timestamp: number;
  mexc_bid: number | null;
  mexc_ask: number | null;
  mexc_price: number | null;
  jupiter_price: number | null;
  pancakeswap_price: number | null;
}

export interface SpreadResponse {
  symbol: string;
  chain: 'solana' | 'bsc';
  history: SpreadDataPoint[];
  current: CurrentData | null;
  sources: {
    mexc: boolean;
    jupiter: boolean;
    pancakeswap: boolean;
  };
}

export type TimeframeOption = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

/**
 * Лимиты на покупку MEXC
 */
export interface MexcTradingLimits {
  minNotional?: number;
  minQty?: number;
  maxQty?: number;
  stepSize?: number;
}

/**
 * Токен с лимитами MEXC
 */
export interface TokenWithLimits extends Token {
  mexcLimits?: MexcTradingLimits;
}

/**
 * Данные прямого спреда из WebSocket API (sharkStraight)
 * 
 * Примечание: Обратный спред (sharkReverse) будет использовать аналогичную структуру
 */
export interface StraightData {
  token: string;
  aExchange: string; // Например, "Jupiter"
  bExchange: string; // Например, "MEXC"
  priceA: string; // Цена на бирже A
  priceB: string; // Цена на бирже B
  spread: string; // Спред в процентах
  network: string; // Например, "solana" или "bsc"
  limit: string; // Например, "all"
}

/**
 * Данные обратного спреда из WebSocket API (sharkReverse)
 * 
 * TODO: Будет реализовано позже, структура будет аналогична StraightData
 * Endpoint: /socket/sharkReverse
 */
export interface ReverseData {
  token: string;
  aExchange: string;
  bExchange: string;
  priceA: string;
  priceB: string;
  spread: string;
  network: string;
  limit: string;
}

/**
 * Нормализованные данные спреда после парсинга ответа бэкенда.
 * Используется фронтом для отображения токенов и расчётов.
 */
export interface SpreadRow {
  token: string;
  chain: 'solana' | 'bsc';
  aExchange: string;
  bExchange: string;
  priceA: number | null;
  priceB: number | null;
  spread: number | null;
  limit: string;
}

