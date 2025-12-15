import { z } from 'zod';

/**
 * Zod схемы для валидации ответов PancakeSwap/DexScreener API
 * DexScreener API: https://api.dexscreener.com
 */

/**
 * Схема для токена в паре DexScreener
 */
export const DexScreenerTokenSchema = z.object({
  address: z.string().optional(),
  symbol: z.string().min(1, 'Symbol is required'),
  name: z.string().optional(),
});

/**
 * Схема для пары токенов DexScreener
 */
export const DexScreenerPairSchema = z
  .object({
    chainId: z.string().optional(),
    dexId: z.string().optional(),
    url: z.string().url().optional(),
    pairAddress: z.string().optional(),
    baseToken: DexScreenerTokenSchema.optional(),
    quoteToken: DexScreenerTokenSchema.optional(),
    priceNative: z.string().optional(),
    priceUsd: z.string().optional(),
    txns: z
      .object({
        m5: z
          .object({
            buys: z.number().optional(),
            sells: z.number().optional(),
          })
          .optional(),
        h1: z
          .object({
            buys: z.number().optional(),
            sells: z.number().optional(),
          })
          .optional(),
        h6: z
          .object({
            buys: z.number().optional(),
            sells: z.number().optional(),
          })
          .optional(),
        h24: z
          .object({
            buys: z.number().optional(),
            sells: z.number().optional(),
          })
          .optional(),
      })
      .optional(),
    volume: z
      .object({
        h24: z.number().optional(),
        h6: z.number().optional(),
        h1: z.number().optional(),
        m5: z.number().optional(),
      })
      .optional(),
    priceChange: z
      .object({
        m5: z.number().optional(),
        h1: z.number().optional(),
        h6: z.number().optional(),
        h24: z.number().optional(),
      })
      .optional(),
    liquidity: z
      .object({
        usd: z.number().optional(),
        base: z.number().optional(),
        quote: z.number().optional(),
      })
      .optional(),
    fdv: z.number().optional(),
    pairCreatedAt: z.number().optional(),
  })
  .passthrough(); // passthrough для дополнительных полей

/**
 * Схема для ответа DexScreener
 */
export const DexScreenerResponseSchema = z.object({
  schemaVersion: z.string().optional(),
  pairs: z.array(DexScreenerPairSchema).optional(),
  pair: DexScreenerPairSchema.optional(),
});

/**
 * Типы, выведенные из схем
 */
export type DexScreenerToken = z.infer<typeof DexScreenerTokenSchema>;
export type DexScreenerPair = z.infer<typeof DexScreenerPairSchema>;
export type DexScreenerResponse = z.infer<typeof DexScreenerResponseSchema>;
