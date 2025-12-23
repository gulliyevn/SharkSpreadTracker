import { describe, it, expect } from 'vitest';
import { backendClient } from '../backend.client';

describe('backendClient', () => {
  it('should be an axios instance', () => {
    expect(backendClient).toBeDefined();
    expect(typeof backendClient.get).toBe('function');
    expect(typeof backendClient.post).toBe('function');
    expect(typeof backendClient.put).toBe('function');
    expect(typeof backendClient.delete).toBe('function');
  });

  it('should have correct default headers', () => {
    expect(backendClient.defaults.headers['Content-Type']).toBe(
      'application/json'
    );
  });

  it('should have withCredentials set to false', () => {
    expect(backendClient.defaults.withCredentials).toBe(false);
  });

  it('should have timeout configured', () => {
    expect(backendClient.defaults.timeout).toBeGreaterThan(0);
  });
});
