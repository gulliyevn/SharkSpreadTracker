import { z } from 'zod';

/**
 * Zod схемы для валидации агрегированных данных спреда
 */

/**
 * Схема для одной точки данных спреда
 */
export const SpreadDataPointSchema = z.object({
  timestamp: z.number().int().positive('Timestamp must be positive'),
  mexc_price: z.number().positive().nullable(),
  mexc_bid: z.number().positive().nullable().optional(),
  mexc_ask: z.number().positive().nullable().optional(),
  jupiter_price: z.number().positive().nullable(),
  pancakeswap_price: z.number().positive().nullable(),
});

/**
 * Схема для текущих данных
 */
export const CurrentDataSchema = z.object({
  timestamp: z.number().int().positive('Timestamp must be positive'),
  mexc_bid: z.number().positive().nullable(),
  mexc_ask: z.number().positive().nullable(),
  mexc_price: z.number().positive().nullable(),
  jupiter_price: z.number().positive().nullable(),
  pancakeswap_price: z.number().positive().nullable(),
});

/**
 * Схема для информации об источниках
 */
export const SourcesSchema = z.object({
  mexc: z.boolean(),
  jupiter: z.boolean(),
  pancakeswap: z.boolean(),
});

/**
 * Схема для полного ответа со спредом
 */
export const SpreadResponseSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
  chain: z.enum(['solana', 'bsc'], {
    errorMap: () => ({ message: 'Chain must be either solana or bsc' }),
  }),
  history: z.array(SpreadDataPointSchema),
  current: CurrentDataSchema.nullable(),
  sources: SourcesSchema,
});

/**
 * Схема для расчета спреда
 */
export const SpreadCalculationSchema = z.object({
  directSpread: z.number().nullable(), // Спред от source к target
  reverseSpread: z.number().nullable(), // Спред от target к source
  sourcePrice: z.number().positive().nullable(),
  targetPrice: z.number().positive().nullable(),
  timestamp: z.number().int().positive(),
});

/**
 * Типы, выведенные из схем
 */
export type SpreadDataPoint = z.infer<typeof SpreadDataPointSchema>;
export type CurrentData = z.infer<typeof CurrentDataSchema>;
export type Sources = z.infer<typeof SourcesSchema>;
export type SpreadResponse = z.infer<typeof SpreadResponseSchema>;
export type SpreadCalculation = z.infer<typeof SpreadCalculationSchema>;

