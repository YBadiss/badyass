import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DB } from '../src/db.js';

describe('DB', () => {
  let db: DB;

  beforeEach(() => {
    db = new DB(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('initializes with null state', () => {
    const state = db.getState();
    expect(state.threadId).toBeNull();
    expect(state.firstMessageId).toBeNull();
    expect(state.lastPollMs).toBeNull();
  });

  it('updates and reads back threadId', () => {
    db.updateState({ threadId: 'thread-123' });
    expect(db.getState().threadId).toBe('thread-123');
  });

  it('partial update preserves other fields', () => {
    db.updateState({ threadId: 'thread-123', firstMessageId: 'msg-1', lastPollMs: 1000 });
    db.updateState({ lastPollMs: 2000 });
    const state = db.getState();
    expect(state.threadId).toBe('thread-123');
    expect(state.firstMessageId).toBe('msg-1');
    expect(state.lastPollMs).toBe(2000);
  });

  it('marks email as processed and detects it', () => {
    expect(db.isEmailProcessed('gmail-abc')).toBe(false);
    db.markEmailProcessed('gmail-abc');
    expect(db.isEmailProcessed('gmail-abc')).toBe(true);
  });

  it('returns false for unprocessed email', () => {
    db.markEmailProcessed('gmail-abc');
    expect(db.isEmailProcessed('gmail-xyz')).toBe(false);
  });

  it('markEmailProcessed is idempotent', () => {
    db.markEmailProcessed('gmail-abc');
    db.markEmailProcessed('gmail-abc');
    expect(db.isEmailProcessed('gmail-abc')).toBe(true);
  });

  it('close does not throw', () => {
    expect(() => db.close()).not.toThrow();
  });
});
