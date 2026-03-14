import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { Bridge } from '../src/bridge.js';
import { DB } from '../src/db.js';
import type { Config } from '../src/config.js';
import { ReplayWAPort } from './helpers/replay-wa.js';
import { ReplayGmailPort } from './helpers/replay-gmail.js';
import type { WAIncomingMessage } from '../src/ports.js';

function loadWAFixture(name: string): WAIncomingMessage {
  return JSON.parse(readFileSync(`test/fixtures/wa-messages/${name}.json`, 'utf-8'));
}

function loadGmailFixture(name: string) {
  return JSON.parse(readFileSync(`test/fixtures/gmail-responses/${name}.json`, 'utf-8'));
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
    wa.replay([loadWAFixture('text')]);
    await vi.advanceTimersByTimeAsync(30000);

    expect(gmail.sentEmails).toHaveLength(1);
    expect(gmail.sentEmails[0].body).toBe('[Alice]: hey, are we meeting tomorrow?');
    expect(gmail.sentEmails[0].to).toBe('friend@example.com');
    expect(gmail.sentEmails[0].subject).toBe('WA Thread');
  });

  it('batches 3 messages within debounce into one email', async () => {
    wa.replay([loadWAFixture('text')]);
    await vi.advanceTimersByTimeAsync(10000);
    wa.replay([loadWAFixture('link-preview')]);
    await vi.advanceTimersByTimeAsync(10000);
    wa.replay([loadWAFixture('location')]);
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

    wa.replay([loadWAFixture('text'), loadWAFixture('link-preview'), loadWAFixture('location')]);
    await vi.advanceTimersByTimeAsync(0);

    expect(gmail.sentEmails).toHaveLength(1);
    await bridge2.stop();
  });

  it('creates thread on first flush, reuses on second', async () => {
    wa.replay([loadWAFixture('text')]);
    await vi.advanceTimersByTimeAsync(30000);

    expect(gmail.sentEmails[0].threadId).toBeUndefined();
    expect(db.getState().threadId).toBe('thread-1');
    expect(db.getState().firstMessageId).toBe('msg-1');

    wa.replay([loadWAFixture('link-preview')]);
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
      wa.replay([loadWAFixture(fixture)]);
    }
    await vi.advanceTimersByTimeAsync(30000);

    const body = gmail.sentEmails[0].body;
    for (const [, expected] of fixtures) {
      expect(body).toContain(expected);
    }
  });

  it('skips reactions', async () => {
    wa.replay([loadWAFixture('reaction')]);
    await vi.advanceTimersByTimeAsync(30000);
    expect(gmail.sentEmails).toHaveLength(0);
  });

  it('skips poll votes', async () => {
    wa.replay([loadWAFixture('poll-vote')]);
    await vi.advanceTimersByTimeAsync(30000);
    expect(gmail.sentEmails).toHaveLength(0);
  });

  it('allows fromMe messages that are not bridge echoes', async () => {
    const msg = loadWAFixture('text');
    msg.key.fromMe = true;
    wa.replay([msg]);
    await vi.advanceTimersByTimeAsync(30000);
    expect(gmail.sentEmails).toHaveLength(1);
  });

  it('filters fromMe bridge echo messages', async () => {
    const msg = loadWAFixture('text');
    msg.key.fromMe = true;
    msg.message!.conversation = '[John via email]: some reply';
    wa.replay([msg]);
    await vi.advanceTimersByTimeAsync(30000);
    expect(gmail.sentEmails).toHaveLength(0);
  });

  it('filters wrong group JID', async () => {
    const msg = loadWAFixture('text');
    msg.key.remoteJid = 'wrong-group@g.us';
    wa.replay([msg]);
    await vi.advanceTimersByTimeAsync(30000);
    expect(gmail.sentEmails).toHaveLength(0);
  });
});

describe('Bridge — Email → WA', () => {
  let db: DB;
  let wa: ReplayWAPort;
  let gmail: ReplayGmailPort;
  let bridge: Bridge;

  afterEach(async () => {
    await bridge.stop();
    db.close();
    vi.useRealTimers();
  });

  function setup(pollResponses: unknown[][]) {
    vi.useFakeTimers();
    db = new DB(':memory:');
    // Seed a thread so polling has something to poll
    db.updateState({ threadId: 'thread-1', firstMessageId: 'msg-1' });
    wa = new ReplayWAPort();
    gmail = new ReplayGmailPort({ poll: pollResponses as any });
    bridge = new Bridge(wa, gmail, db, baseConfig);
    bridge.start();
    bridge.startPolling();
  }

  it('forwards friend reply to WA group', async () => {
    setup([loadGmailFixture('poll-one-reply')]);
    await vi.advanceTimersByTimeAsync(60000);

    expect(wa.sentMessages).toHaveLength(1);
    expect(wa.sentMessages[0].jid).toBe('12345-67890@g.us');
    expect(wa.sentMessages[0].text).toBe('[John via email]: Sounds great, see you at 6pm!');
  });

  it('strips quoted history from reply', async () => {
    setup([loadGmailFixture('poll-reply-with-quoted-history')]);
    await vi.advanceTimersByTimeAsync(60000);

    expect(wa.sentMessages).toHaveLength(1);
    expect(wa.sentMessages[0].text).toBe("[John via email]: Yes I'll be there");
    expect(wa.sentMessages[0].text).not.toContain('wrote:');
  });

  it('skips own sent emails', async () => {
    setup([loadGmailFixture('poll-own-message')]);
    await vi.advanceTimersByTimeAsync(60000);

    expect(wa.sentMessages).toHaveLength(0);
  });

  it('skips already-processed emails (dedup)', async () => {
    db = new DB(':memory:');
    db.updateState({ threadId: 'thread-1', firstMessageId: 'msg-1' });
    db.markEmailProcessed('gmail-reply-001');

    vi.useFakeTimers();
    wa = new ReplayWAPort();
    gmail = new ReplayGmailPort({ poll: [loadGmailFixture('poll-one-reply')] });
    bridge = new Bridge(wa, gmail, db, baseConfig);
    bridge.start();
    bridge.startPolling();

    await vi.advanceTimersByTimeAsync(60000);

    expect(wa.sentMessages).toHaveLength(0);
  });

  it('updates checkpoint after empty poll', async () => {
    setup([loadGmailFixture('poll-empty')]);
    const before = Date.now();
    await vi.advanceTimersByTimeAsync(60000);

    expect(wa.sentMessages).toHaveLength(0);
    expect(db.getState().lastPollMs).toBeGreaterThanOrEqual(before);
  });

  it('skips polling when no thread exists', async () => {
    vi.useFakeTimers();
    db = new DB(':memory:');
    wa = new ReplayWAPort();
    gmail = new ReplayGmailPort({ poll: [loadGmailFixture('poll-one-reply')] });
    bridge = new Bridge(wa, gmail, db, baseConfig);
    bridge.start();
    bridge.startPolling();

    await vi.advanceTimersByTimeAsync(60000);

    expect(wa.sentMessages).toHaveLength(0);
    // Poll queue should not have been consumed
  });
});

describe('Bridge — State & Recovery', () => {
  it('thread ID persists across restart', async () => {
    vi.useFakeTimers();
    const db = new DB(':memory:');
    const wa1 = new ReplayWAPort();
    const gmail1 = new ReplayGmailPort({
      send: [{ threadId: 'thread-1', messageId: 'msg-1' }],
    });
    const bridge1 = new Bridge(wa1, gmail1, db, baseConfig);
    bridge1.start();

    wa1.replay([loadWAFixture('text')]);
    await vi.advanceTimersByTimeAsync(30000);
    await bridge1.stop();

    // "Restart" — new bridge, same DB
    const wa2 = new ReplayWAPort();
    const gmail2 = new ReplayGmailPort();
    const bridge2 = new Bridge(wa2, gmail2, db, baseConfig);
    bridge2.start();

    wa2.replay([loadWAFixture('link-preview')]);
    await vi.advanceTimersByTimeAsync(30000);

    expect(gmail2.sentEmails[0].threadId).toBe('thread-1');
    expect(gmail2.sentEmails[0].inReplyTo).toBe('msg-1');
    await bridge2.stop();
    db.close();
    vi.useRealTimers();
  });

  it('dedup table prevents replaying old emails after restart', async () => {
    vi.useFakeTimers();
    const db = new DB(':memory:');
    db.updateState({ threadId: 'thread-1', firstMessageId: 'msg-1' });

    // First run — process the reply
    const wa1 = new ReplayWAPort();
    const gmail1 = new ReplayGmailPort({
      poll: [loadGmailFixture('poll-one-reply')],
    });
    const bridge1 = new Bridge(wa1, gmail1, db, baseConfig);
    bridge1.start();
    bridge1.startPolling();
    await vi.advanceTimersByTimeAsync(60000);
    expect(wa1.sentMessages).toHaveLength(1);
    await bridge1.stop();

    // "Restart" — same DB, same reply comes back from poll
    const wa2 = new ReplayWAPort();
    const gmail2 = new ReplayGmailPort({
      poll: [loadGmailFixture('poll-one-reply')],
    });
    const bridge2 = new Bridge(wa2, gmail2, db, baseConfig);
    bridge2.start();
    bridge2.startPolling();
    await vi.advanceTimersByTimeAsync(60000);

    expect(wa2.sentMessages).toHaveLength(0);
    await bridge2.stop();
    db.close();
    vi.useRealTimers();
  });
});
