/**
 * Альтернативные функции API с Result<T, E> типом для явной обработки ошибок
 *
 * Эти функции возвращают Result<T, E> вместо пустых массивов при ошибках,
 * что позволяет компонентам явно обрабатывать ошибки.
 *
 * Использование:
 * ```ts
 * const result = await getAllTokensResult();
 * if (result.success) {
 *   // использовать result.data
 * } else {
 *   // обработать result.error
 * }
 * ```
 */

import {
  getAllTokens,
  getJupiterTokens,
  getPancakeTokens,
  getMexcTokens,
} from './tokens.api';
import type { Token } from '@/types';
import type { TokenWithData } from './tokens.api';
import { Result, ok, err, ApiError } from '@/utils/errors';
import { isAxiosError, getErrorStatusCode } from '@/utils/errors';

/**
 * Получить все токены с Result типом
 */
export async function getAllTokensResult(): Promise<
  Result<TokenWithData[], ApiError>
> {
  try {
    const tokens = await getAllTokens();
    return ok(tokens);
  } catch (error: unknown) {
    const statusCode = isAxiosError(error) ? getErrorStatusCode(error) : null;
    const apiError = new ApiError(
      'Failed to fetch tokens from all sources',
      statusCode || 500,
      error
    );
    return err(apiError);
  }
}

/**
 * Получить токены Jupiter с Result типом
 */
export async function getJupiterTokensResult(): Promise<
  Result<Token[], ApiError>
> {
  try {
    const tokens = await getJupiterTokens();
    return ok(tokens);
  } catch (error: unknown) {
    const statusCode = isAxiosError(error) ? getErrorStatusCode(error) : null;
    const apiError = new ApiError(
      'Failed to fetch tokens from Jupiter',
      statusCode || 500,
      error
    );
    return err(apiError);
  }
}

/**
 * Получить токены PancakeSwap с Result типом
 */
export async function getPancakeTokensResult(): Promise<
  Result<Token[], ApiError>
> {
  try {
    const tokens = await getPancakeTokens();
    return ok(tokens);
  } catch (error: unknown) {
    const statusCode = isAxiosError(error) ? getErrorStatusCode(error) : null;
    const apiError = new ApiError(
      'Failed to fetch tokens from PancakeSwap',
      statusCode || 500,
      error
    );
    return err(apiError);
  }
}

/**
 * Получить токены MEXC с Result типом
 */
export async function getMexcTokensResult(): Promise<
  Result<Token[], ApiError>
> {
  try {
    const tokens = await getMexcTokens();
    return ok(tokens);
  } catch (error: unknown) {
    const statusCode = isAxiosError(error) ? getErrorStatusCode(error) : null;
    const apiError = new ApiError(
      'Failed to fetch tokens from MEXC',
      statusCode || 500,
      error
    );
    return err(apiError);
  }
}
