import { describe, it, expect } from 'vitest';
import {
  sanitizeArray,
  sanitizeObject,
  safeExtract,
  StringSchema,
  NumberSchema,
  PositiveNumberSchema,
  TimestampSchema,
} from '../sanitization';
import { z } from 'zod';

describe('sanitization', () => {
  describe('sanitizeArray', () => {
    it('should sanitize valid array', () => {
      const schema = z.string();
      const data = ['a', 'b', 'c'];
      const result = sanitizeArray(data, schema);
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('should filter invalid items', () => {
      const schema = z.string();
      const data = ['a', 123, 'c', null];
      const result = sanitizeArray(data, schema);
      expect(result).toEqual(['a', 'c']);
    });

    it('should return empty array for non-array input', () => {
      const schema = z.string();
      expect(sanitizeArray(null, schema)).toEqual([]);
      expect(sanitizeArray({}, schema)).toEqual([]);
      expect(sanitizeArray('string', schema)).toEqual([]);
    });

    it('should handle empty array', () => {
      const schema = z.string();
      expect(sanitizeArray([], schema)).toEqual([]);
    });
  });

  describe('sanitizeObject', () => {
    const TestSchema = z.object({
      name: z.string(),
      age: z.number(),
    });

    it('should sanitize valid object', () => {
      const data = { name: 'John', age: 30 };
      const result = sanitizeObject(data, TestSchema);
      expect(result).toEqual(data);
    });

    it('should return null for invalid object', () => {
      const data = { name: 'John', age: 'not-a-number' };
      expect(sanitizeObject(data, TestSchema)).toBeNull();
    });

    it('should return null for null/undefined', () => {
      expect(sanitizeObject(null, TestSchema)).toBeNull();
      expect(sanitizeObject(undefined, TestSchema)).toBeNull();
    });
  });

  describe('safeExtract', () => {
    it('should extract value successfully', () => {
      const data = { a: { b: 42 } };
      const result = safeExtract(
        data,
        (d) => (d as { a: { b: number } }).a.b,
        0
      );
      expect(result).toBe(42);
    });

    it('should return fallback on error', () => {
      const data = null;
      const result = safeExtract(
        data,
        (d) => (d as { a: { b: number } }).a.b,
        0
      );
      expect(result).toBe(0);
    });

    it('should return fallback for null result', () => {
      const data = { a: { b: null } };
      const result = safeExtract(
        data,
        (d) => (d as { a: { b: number | null } }).a.b,
        0
      );
      expect(result).toBe(0);
    });
  });

  describe('schemas', () => {
    it('StringSchema should validate strings', () => {
      expect(StringSchema.safeParse('hello').success).toBe(true);
      expect(StringSchema.safeParse('').success).toBe(false);
      expect(StringSchema.safeParse('  hello  ').success).toBe(true);
    });

    it('NumberSchema should validate finite numbers', () => {
      expect(NumberSchema.safeParse(42).success).toBe(true);
      expect(NumberSchema.safeParse(Infinity).success).toBe(false);
      expect(NumberSchema.safeParse(NaN).success).toBe(false);
    });

    it('PositiveNumberSchema should validate positive numbers', () => {
      expect(PositiveNumberSchema.safeParse(42).success).toBe(true);
      expect(PositiveNumberSchema.safeParse(-1).success).toBe(false);
      expect(PositiveNumberSchema.safeParse(0).success).toBe(false);
    });

    it('TimestampSchema should validate timestamps', () => {
      expect(TimestampSchema.safeParse(Date.now()).success).toBe(true);
      expect(TimestampSchema.safeParse(-1).success).toBe(false);
      expect(TimestampSchema.safeParse(0.5).success).toBe(false);
    });
  });
});

