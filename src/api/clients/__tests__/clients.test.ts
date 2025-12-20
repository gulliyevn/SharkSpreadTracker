import { describe, it, expect } from 'vitest';
import { jupiterClient, mexcClient, pancakeClient } from '../index';

describe('API Clients', () => {
  describe('jupiterClient', () => {
    it('should be created and have baseURL', () => {
      expect(jupiterClient).toBeDefined();
      expect(jupiterClient.defaults.baseURL).toBeDefined();
    });

    it('should have timeout configured', () => {
      expect(jupiterClient.defaults.timeout).toBeDefined();
    });
  });

  describe('mexcClient', () => {
    it('should be created and have baseURL', () => {
      expect(mexcClient).toBeDefined();
      expect(mexcClient.defaults.baseURL).toBeDefined();
    });

    it('should have timeout configured', () => {
      expect(mexcClient.defaults.timeout).toBeDefined();
    });
  });

  describe('pancakeClient', () => {
    it('should be created and have baseURL', () => {
      expect(pancakeClient).toBeDefined();
      expect(pancakeClient.defaults.baseURL).toBeDefined();
    });

    it('should have timeout configured', () => {
      expect(pancakeClient.defaults.timeout).toBeDefined();
    });
  });

  describe('clients export', () => {
    it('should export all clients', () => {
      expect(jupiterClient).toBeDefined();
      expect(mexcClient).toBeDefined();
      expect(pancakeClient).toBeDefined();
    });
  });
});
