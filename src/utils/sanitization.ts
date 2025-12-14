/**
 * Утилиты для санитизации данных от API
 */

import { z } from 'zod';

/**
 * Базовые схемы для санитизации
 */
export const StringSchema = z.string().trim().min(1);
export const NumberSchema = z.number().finite();
export const PositiveNumberSchema = z.number().positive().finite();
export const TimestampSchema = z.number().int().positive();

/**
 * Санитизация массива с валидацией через Zod
 */
export function sanitizeArray<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): T[] {
  try {
    if (!Array.isArray(data)) {
      return [];
    }
    return data
      .map((item) => {
        try {
          return schema.parse(item);
        } catch {
          return null;
        }
      })
      .filter((item): item is T => item !== null);
  } catch {
    return [];
  }
}

/**
 * Санитизация объекта с валидацией через Zod
 */
export function sanitizeObject<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): T | null {
  try {
    return schema.parse(data);
  } catch {
    return null;
  }
}

/**
 * Безопасное извлечение вложенного значения
 */
export function safeExtract<T>(
  data: unknown,
  extractor: (data: unknown) => T,
  fallback: T
): T {
  try {
    const result = extractor(data);
    return result ?? fallback;
  } catch {
    return fallback;
  }
}

