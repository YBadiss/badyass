import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { Bridge } from '../src/bridge.js';
import { DB } from '../src/db.js';
import type { Config } from '../src/config.js';
import { ReplayWAPort } from './helpers/replay-wa.js';
import { ReplayGmailPort } from './helpers/replay-gmail.js';
import type { WAIncomingMessage } from '../src/ports.js';

function loadFixture(name: string): WAIncomingMessage {
  return JSON.parse(readFileSync(`test/fixtures/wa-messages/${name}.json`, 'utf-8'));
}

const baseConfig: Config = {
  WA_GROUP_JID: '12345-67890@g.us',
  GMAIL_ADDRESS: 'me@gmail.com',
  GMAIL_CLIENT_ID: 'cid',
  GMAIL_CLIENT_SECRET: 'csec',
  GMAIL_REFRESH_TOKEN: 'rtok',
  FRIEND_EMAIL: 'friend@example.com',
  FRIEND_NAME: 'John',
  EMAIL_SUBJECT: 'WA Thread',
  POLL_INTERVAL_MS: 60000,
  DEBOUNCE_MS: 30000,
  DEBOUNCE_MAX_BATCH: 20,
  STORE_PATH: './store',
};

describe('Bridge — WA → Email', () => {
  let db: DB;
  let wa: ReplayWAPort;
  let gmail: ReplayGmailPort;
  let bridge: Bridge;

  beforeEach(() => {
    vi.useFakeTimers();
    db = new DB(':memory:');
    wa = new ReplayWAPort();
    gmail = new ReplayGmailPort({
      send: [
        { threadId: 'thread-1', messageId: 'msg-1' },
        { threadId: 'thread-1', messageId: 'msg-2' },
        { threadId: 'thread-1', messageId: 'msg-3' },
      ],
    });
    bridge = new Bridge(wa, gmail, db, baseConfig);
    bridge.start();
  });

  afterEach(async () => {
    await bridge.stop();
    db.close();
    vi.useRealTimers();
  });

  it('sends a text message as email after debounce', async () => {
    wa.replay([loadFixture('text')]);
    await vi.advanceTimersByTimeAsync(30000);

    expect(gmail.sentEmails).toHaveLength(1);
    expect(gmail.sentEmails[0].body).toBe('[Alice]: hey, are we meeting tomorrow?');
    expect(gmail.sentEmails[0].to).toBe('friend@example.com');
    expect(gmail.sentEmails[0].subject).toBe('WA Thread');
  });

  it('batches 3 messages within debounce into one email', async () => {
    wa.replay([loadFixture('text')]);
    await vi.advanceTimersByTimeAsync(10000);
    wa.replay([loadFixture('link-preview')]);
    await vi.advanceTimersByTimeAsync(10000);
    wa.replay([loadFixture('location')]);
    await vi.advanceTimersByTimeAsync(30000);

    expect(gmail.sentEmails).toHaveLength(1);
    const lines = gmail.sentEmails[0].body.split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('[Alice]: hey, are we meeting tomorrow?');
    expect(lines[1]).toBe('[Bob]: check this out https://example.com');
    expect(lines[2]).toContain('📍');
  });

  it('flushes at max batch cap', async () => {
    const config = { ...baseConfig, DEBOUNCE_MAX_BATCH: 3 };
    const bridge2 = new Bridge(wa, gmail, db, config);
    bridge2.start();

    wa.replay([loadFixture('text'), loadFixture('link-preview'), loadFixture('location')]);
    await vi.advanceTimersByTimeAsync(0);

    expect(gmail.sentEmails).toHaveLength(1);
    await bridge2.stop();
  });

  it('creates thread on first flush, reuses on second', async () => {
    wa.replay([loadFixture('text')]);
    await vi.advanceTimersByTimeAsync(30000);

    expect(gmail.sentEmails[0].threadId).toBeUndefined();
    expect(db.getState().threadId).toBe('thread-1');
    expect(db.getState().firstMessageId).toBe('msg-1');

    wa.replay([loadFixture('link-preview')]);
    await vi.advanceTimersByTimeAsync(30000);

    expect(gmail.sentEmails[1].threadId).toBe('thread-1');
    expect(gmail.sentEmails[1].inReplyTo).toBe('msg-1');
    expect(gmail.sentEmails[1].subject).toBe('Re: WA Thread');
  });

  it('handles each message type correctly', async () => {
    const fixtures: Array<[string, string]> = [
      ['poll-creation', '📊 Poll:'],
      ['image', '[sent an image: look at this]'],
      ['video', '[sent a video: check this out]'],
      ['gif', '[sent a GIF]'],
      ['audio', '[sent a voice note]'],
      ['sticker', '[sent a sticker]'],
      ['document', '[sent a file: report.pdf]'],
      ['contact', '[shared contact: Jane Doe'],
      ['live-location', '📍 Live location:'],
    ];

    for (const [fixture, expected] of fixtures) {
      wa.replay([loadFixture(fixture)]);
    }
    await vi.advanceTimersByTimeAsync(30000);

    const body = gmail.sentEmails[0].body;
    for (const [, expected] of fixtures) {
      expect(body).toContain(expected);
    }
  });

  it('skips reactions', async () => {
    wa.replay([loadFixture('reaction')]);
    await vi.advanceTimersByTimeAsync(30000);
    expect(gmail.sentEmails).toHaveLength(0);
  });

  it('skips poll votes', async () => {
    wa.replay([loadFixture('poll-vote')]);
    await vi.advanceTimersByTimeAsync(30000);
    expect(gmail.sentEmails).toHaveLength(0);
  });

  it('filters fromMe messages', async () => {
    const msg = loadFixture('text');
    msg.key.fromMe = true;
    wa.replay([msg]);
    await vi.advanceTimersByTimeAsync(30000);
    expect(gmail.sentEmails).toHaveLength(0);
  });

  it('filters wrong group JID', async () => {
    const msg = loadFixture('text');
    msg.key.remoteJid = 'wrong-group@g.us';
    wa.replay([msg]);
    await vi.advanceTimersByTimeAsync(30000);
    expect(gmail.sentEmails).toHaveLength(0);
  });
});
