import { z } from 'zod';

/**
 * Zod схемы для валидации ответов MEXC API
 * MEXC API: https://contract.mexc.com
 */

/**
 * Схема для фильтра MIN_NOTIONAL
 */
export const MexcMinNotionalFilterSchema = z.object({
  filterType: z.literal('MIN_NOTIONAL'),
  minNotional: z.string(),
});

/**
 * Схема для фильтра LOT_SIZE
 */
export const MexcLotSizeFilterSchema = z.object({
  filterType: z.literal('LOT_SIZE'),
  minQty: z.string(),
  maxQty: z.string(),
  stepSize: z.string(),
});

/**
 * Схема для фильтров MEXC (union)
 * Используем обычный union вместо discriminatedUnion, так как fallback схема может не иметь filterType
 */
export const MexcFilterSchema = z.union([
  MexcMinNotionalFilterSchema,
  MexcLotSizeFilterSchema,
  // Другие типы фильтров (MARKET_LOT_SIZE, MAX_NUM_ORDERS, etc.) - принимаем любой объект
  z.record(z.unknown()),
]);

/**
 * Схема для символа MEXC
 */
export const MexcSymbolSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
  status: z.enum(['ENABLED', 'DISABLED', 'BREAK']),
  baseAsset: z.string().optional(),
  quoteAsset: z.string().optional(),
  baseAssetPrecision: z.number().int().positive().optional(),
  quotePrecision: z.number().int().positive().optional(),
  orderTypes: z.array(z.string()).optional(),
  icebergAllowed: z.boolean().optional(),
  ocoAllowed: z.boolean().optional(),
  isSpotTradingAllowed: z.boolean().optional(),
  isMarginTradingAllowed: z.boolean().optional(),
  filters: z.array(MexcFilterSchema).optional(),
  permissions: z.array(z.string()).optional(),
});

/**
 * Схема для информации о бирже MEXC
 */
export const MexcExchangeInfoSchema = z.object({
  timezone: z.string().optional(),
  serverTime: z.number().optional(),
  rateLimits: z.array(z.unknown()).optional(),
  exchangeFilters: z.array(z.unknown()).optional(),
  symbols: z.array(MexcSymbolSchema).optional(),
});

/**
 * Схема для тикера MEXC (цена)
 */
export const MexcTickerSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
  price: z.string().regex(/^\d+\.?\d*$/, 'Price must be a valid number string'),
  bidPrice: z
    .string()
    .regex(/^\d+\.?\d*$/, 'Bid price must be a valid number string')
    .optional(),
  askPrice: z
    .string()
    .regex(/^\d+\.?\d*$/, 'Ask price must be a valid number string')
    .optional(),
  volume: z.string().optional(),
  quoteVolume: z.string().optional(),
  openPrice: z.string().optional(),
  highPrice: z.string().optional(),
  lowPrice: z.string().optional(),
  prevClosePrice: z.string().optional(),
  priceChange: z.string().optional(),
  priceChangePercent: z.string().optional(),
  weightedAvgPrice: z.string().optional(),
  lastPrice: z.string().optional(),
  lastQty: z.string().optional(),
  bidQty: z.string().optional(),
  askQty: z.string().optional(),
  openTime: z.number().optional(),
  closeTime: z.number().optional(),
  firstId: z.number().optional(),
  lastId: z.number().optional(),
  count: z.number().optional(),
});

/**
 * Схема для массива тикеров MEXC
 */
export const MexcTickersResponseSchema = z.array(MexcTickerSchema);

/**
 * Типы, выведенные из схем
 */
export type MexcSymbol = z.infer<typeof MexcSymbolSchema>;
export type MexcExchangeInfo = z.infer<typeof MexcExchangeInfoSchema>;
export type MexcTicker = z.infer<typeof MexcTickerSchema>;
export type MexcTickersResponse = z.infer<typeof MexcTickersResponseSchema>;
