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
 * Примечание: Endpoint /socket/sharkReverse еще не реализован на бэкенде.
 * Структура идентична StraightData - когда endpoint будет готов, будет использована та же логика.
 * 
 * План реализации:
 * 1. Бэкенд реализует /socket/sharkReverse (аналогично /socket/sharkStraight)
 * 2. Создать функцию fetchReverseSpreads (аналогично fetchStraightSpreads)
 * 3. Подключить к getSpreadsForTokens и другим местам где нужен reverseSpread
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

/**
 * Токен с дополнительными данными (цена, спреды)
 */
export interface TokenWithData extends Token {
  price?: number | null;
  directSpread?: number | null;
  reverseSpread?: number | null;
}

/**
 * Цена токена из одного источника
 */
export interface TokenPrice {
  price: number | null;
  bid?: number | null;
  ask?: number | null;
  timestamp: number;
  source: 'jupiter' | 'pancakeswap' | 'mexc';
}

/**
 * Все цены токена из разных источников
 */
export interface AllPrices {
  symbol: string;
  chain: 'solana' | 'bsc';
  jupiter: TokenPrice | null;
  pancakeswap: TokenPrice | null;
  mexc: TokenPrice | null;
  timestamp: number;
}
