import { describe, expect, it } from 'vitest';
import { initializeAPI, clearAuthToken, setAuthToken } from './api';

describe('api client', () => {
  it('applies auth token when initialized', () => {
    const client = initializeAPI('abc123');
    expect(client.defaults.headers.Authorization).toBe('Bearer abc123');
  });

  it('can update and clear auth token', () => {
    const client = initializeAPI();
    expect(client.defaults.headers.common.Authorization).toBeUndefined();

    setAuthToken('xyz789');
    expect(client.defaults.headers.common.Authorization).toBe('Bearer xyz789');

    clearAuthToken();
    expect(client.defaults.headers.common.Authorization).toBeUndefined();
  });
});
