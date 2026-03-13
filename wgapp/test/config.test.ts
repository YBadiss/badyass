import { describe, it, expect } from 'vitest';
import { parseConfig } from '../src/config.js';

const validEnv = {
  GMAIL_ADDRESS: 'test@gmail.com',
  GMAIL_CLIENT_ID: 'client-id-123',
  GMAIL_CLIENT_SECRET: 'client-secret-456',
  GMAIL_REFRESH_TOKEN: 'refresh-token-789',
  FRIEND_EMAIL: 'friend@example.com',
  FRIEND_NAME: 'Alice',
  EMAIL_SUBJECT: 'WA Thread',
};

describe('parseConfig', () => {
  it('parses a complete env with defaults', () => {
    const config = parseConfig(validEnv);
    expect(config.GMAIL_ADDRESS).toBe('test@gmail.com');
    expect(config.FRIEND_NAME).toBe('Alice');
    expect(config.WA_GROUP_JID).toBe('');
    expect(config.POLL_INTERVAL_MS).toBe(60000);
    expect(config.DEBOUNCE_MS).toBe(30000);
    expect(config.DEBOUNCE_MAX_BATCH).toBe(20);
    expect(config.STORE_PATH).toBe('./store');
  });

  it('accepts overridden defaults', () => {
    const config = parseConfig({
      ...validEnv,
      WA_GROUP_JID: '123-456@g.us',
      POLL_INTERVAL_MS: '30000',
      DEBOUNCE_MS: '10000',
      DEBOUNCE_MAX_BATCH: '50',
      STORE_PATH: '/var/www/store',
    });
    expect(config.WA_GROUP_JID).toBe('123-456@g.us');
    expect(config.POLL_INTERVAL_MS).toBe(30000);
    expect(config.DEBOUNCE_MS).toBe(10000);
    expect(config.DEBOUNCE_MAX_BATCH).toBe(50);
    expect(config.STORE_PATH).toBe('/var/www/store');
  });

  it('throws on missing required keys with key names', () => {
    expect(() => parseConfig({})).toThrow('GMAIL_ADDRESS');
    expect(() => parseConfig({})).toThrow('GMAIL_CLIENT_ID');
  });

  it('throws on invalid email', () => {
    expect(() => parseConfig({ ...validEnv, GMAIL_ADDRESS: 'not-an-email' })).toThrow(
      'GMAIL_ADDRESS',
    );
  });

  it('throws on empty required string', () => {
    expect(() => parseConfig({ ...validEnv, FRIEND_NAME: '' })).toThrow('FRIEND_NAME');
  });

  it('ignores extra keys', () => {
    const config = parseConfig({ ...validEnv, SOME_RANDOM_KEY: 'whatever' });
    expect(config.GMAIL_ADDRESS).toBe('test@gmail.com');
    expect((config as Record<string, unknown>)['SOME_RANDOM_KEY']).toBeUndefined();
  });
});
