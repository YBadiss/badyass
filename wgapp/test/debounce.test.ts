import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DebounceBuffer } from '../src/debounce.js';

describe('DebounceBuffer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('flushes after inactivity timeout', async () => {
    const flushed: string[][] = [];
    const buf = new DebounceBuffer(30000, 20, (lines) => {
      flushed.push(lines);
    });

    buf.push('line1');
    buf.push('line2');
    await vi.advanceTimersByTimeAsync(30000);

    expect(flushed).toEqual([['line1', 'line2']]);
  });

  it('resets timer on new push', async () => {
    const flushed: string[][] = [];
    const buf = new DebounceBuffer(30000, 20, (lines) => {
      flushed.push(lines);
    });

    buf.push('line1');
    await vi.advanceTimersByTimeAsync(15000);
    buf.push('line2');
    await vi.advanceTimersByTimeAsync(15000);
    expect(flushed).toEqual([]);

    await vi.advanceTimersByTimeAsync(15000);
    expect(flushed).toEqual([['line1', 'line2']]);
  });

  it('flushes immediately at max batch', async () => {
    const flushed: string[][] = [];
    const buf = new DebounceBuffer(30000, 3, (lines) => {
      flushed.push(lines);
    });

    buf.push('a');
    buf.push('b');
    buf.push('c');

    // Flush happens synchronously on the 3rd push (but onFlush is async)
    await vi.advanceTimersByTimeAsync(0);
    expect(flushed).toEqual([['a', 'b', 'c']]);
  });

  it('forceFlush sends immediately', async () => {
    const flushed: string[][] = [];
    const buf = new DebounceBuffer(30000, 20, (lines) => {
      flushed.push(lines);
    });

    buf.push('urgent');
    await buf.forceFlush();

    expect(flushed).toEqual([['urgent']]);
  });

  it('destroy cancels pending flush', async () => {
    const flushed: string[][] = [];
    const buf = new DebounceBuffer(30000, 20, (lines) => {
      flushed.push(lines);
    });

    buf.push('will be lost');
    buf.destroy();
    await vi.advanceTimersByTimeAsync(30000);

    expect(flushed).toEqual([]);
  });

  it('handles async flush callback', async () => {
    const flushed: string[][] = [];
    const buf = new DebounceBuffer(30000, 20, async (lines) => {
      await new Promise((r) => setTimeout(r, 100));
      flushed.push(lines);
    });

    buf.push('async1');
    await vi.advanceTimersByTimeAsync(30000);
    await vi.advanceTimersByTimeAsync(100);

    expect(flushed).toEqual([['async1']]);
  });
});
