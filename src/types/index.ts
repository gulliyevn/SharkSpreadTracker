export interface Token {
  symbol: string;
  chain: 'solana' | 'bsc';
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

