import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAllTokensResult,
  getJupiterTokensResult,
  getPancakeTokensResult,
  getMexcTokensResult,
} from '../tokens.api.result';
import {
  getAllTokens,
  getJupiterTokens,
  getPancakeTokens,
  getMexcTokens,
} from '../tokens.api';
import { ApiError } from '@/utils/errors';
import { AxiosError } from 'axios';

vi.mock('../tokens.api', () => ({
  getAllTokens: vi.fn(),
  getJupiterTokens: vi.fn(),
  getPancakeTokens: vi.fn(),
  getMexcTokens: vi.fn(),
}));

describe('tokens.api.result', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllTokensResult', () => {
    it('should return ok result with tokens', async () => {
      const mockTokens = [
        { symbol: 'BTC', chain: 'solana' as const, price: 50000 },
      ];
      vi.mocked(getAllTokens).mockResolvedValue(mockTokens);

      const result = await getAllTokensResult();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockTokens);
      }
    });

    it('should return err result on error', async () => {
      const error = new AxiosError('Network error');
      vi.mocked(getAllTokens).mockRejectedValue(error);

      const result = await getAllTokensResult();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ApiError);
        expect(result.error.message).toContain('Failed to fetch tokens');
      }
    });
  });

  describe('getJupiterTokensResult', () => {
    it('should return ok result with tokens', async () => {
      const mockTokens = [{ symbol: 'BTC', chain: 'solana' as const }];
      vi.mocked(getJupiterTokens).mockResolvedValue(mockTokens);

      const result = await getJupiterTokensResult();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockTokens);
      }
    });

    it('should return err result on error', async () => {
      const error = new Error('API Error');
      vi.mocked(getJupiterTokens).mockRejectedValue(error);

      const result = await getJupiterTokensResult();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ApiError);
      }
    });
  });

  describe('getPancakeTokensResult', () => {
    it('should return ok result with tokens', async () => {
      const mockTokens = [{ symbol: 'ETH', chain: 'bsc' as const }];
      vi.mocked(getPancakeTokens).mockResolvedValue(mockTokens);

      const result = await getPancakeTokensResult();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockTokens);
      }
    });

    it('should return err result on error', async () => {
      const error = new Error('API Error');
      vi.mocked(getPancakeTokens).mockRejectedValue(error);

      const result = await getPancakeTokensResult();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ApiError);
      }
    });
  });

  describe('getMexcTokensResult', () => {
    it('should return ok result with tokens', async () => {
      const mockTokens = [{ symbol: 'SOL', chain: 'solana' as const }];
      vi.mocked(getMexcTokens).mockResolvedValue(mockTokens);

      const result = await getMexcTokensResult();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockTokens);
      }
    });

    it('should return err result on error', async () => {
      const error = new Error('API Error');
      vi.mocked(getMexcTokens).mockRejectedValue(error);

      const result = await getMexcTokensResult();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ApiError);
      }
    });
  });
});
