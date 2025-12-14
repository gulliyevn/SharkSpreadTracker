import { z } from 'zod';

/**
 * Zod схемы для валидации ответов Jupiter API
 * Jupiter API: https://lite-api.jup.ag
 */

/**
 * Схема для одного токена Jupiter
 */
export const JupiterTokenSchema = z.object({
  address: z.string().min(1, 'Address is required'),
  symbol: z.string().min(1, 'Symbol is required'),
  name: z.string().optional(),
  decimals: z.number().int().positive().optional(),
  logoURI: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
  chainId: z.number().optional(),
});

/**
 * Схема для массива токенов Jupiter
 */
export const JupiterTokensResponseSchema = z.array(JupiterTokenSchema);

/**
 * Схема для цены токена Jupiter
 */
export const JupiterPriceSchema = z.object({
  id: z.string().optional(),
  mintSymbol: z.string().optional(),
  vsToken: z.string().optional(),
  vsTokenSymbol: z.string().optional(),
  price: z.number().positive().nullable(),
  timeTaken: z.number().optional(),
});

/**
 * Схема для ответа с ценами Jupiter
 */
export const JupiterPricesResponseSchema = z.record(
  z.string(), // token address
  JupiterPriceSchema
);

/**
 * Типы, выведенные из схем
 */
export type JupiterToken = z.infer<typeof JupiterTokenSchema>;
export type JupiterTokensResponse = z.infer<typeof JupiterTokensResponseSchema>;
export type JupiterPrice = z.infer<typeof JupiterPriceSchema>;
export type JupiterPricesResponse = z.infer<typeof JupiterPricesResponseSchema>;

