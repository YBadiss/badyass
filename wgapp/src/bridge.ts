import type { WAPort, GmailPort, WAIncomingMessage } from './ports.js';
import type { DB } from './db.js';
import type { Config } from './config.js';
import { extractContent } from './extract.js';
import { formatLine, stripQuotedReply } from './format.js';
import { DebounceBuffer } from './debounce.js';

export class Bridge {
  private debounceBuffer: DebounceBuffer;
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private wa: WAPort,
    private gmail: GmailPort,
    private db: DB,
    private config: Config,
  ) {
    this.debounceBuffer = new DebounceBuffer(
      config.DEBOUNCE_MS,
      config.DEBOUNCE_MAX_BATCH,
      (lines) => this.flushToEmail(lines),
    );
  }

  start(): void {
    console.log('[bridge] started, listening for WA messages');
    this.wa.onMessage((msg) => this.handleWAMessage(msg));
  }

  startPolling(): void {
    console.log(`[bridge] polling email every ${this.config.POLL_INTERVAL_MS}ms`);
    this.pollInterval = setInterval(() => this.pollEmail(), this.config.POLL_INTERVAL_MS);
  }

  async stop(): Promise<void> {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    await this.debounceBuffer.forceFlush();
  }

  private handleWAMessage(msg: WAIncomingMessage): void {
    if (this.config.WA_GROUP_JID && msg.key.remoteJid !== this.config.WA_GROUP_JID) {
      console.log(`[wa] skipped: wrong group ${msg.key.remoteJid}`);
      return;
    }

    const content = extractContent(msg);
    if (!content) {
      console.log(`[wa] skipped: unsupported message type`);
      return;
    }

    // Skip messages sent by the bridge itself (email replies forwarded back to WA)
    const bridgePrefix = `[${this.config.FRIEND_NAME} via email]:`;
    if (msg.key.fromMe && content.startsWith(bridgePrefix)) {
      console.log(`[wa] skipped: bridge echo`);
      return;
    }

    const sender = msg.pushName ?? 'Unknown';
    const line = formatLine(sender, content);
    console.log(`[wa] buffered: ${line}`);
    this.debounceBuffer.push(line);
  }

  private async flushToEmail(lines: string[]): Promise<void> {
    const body = lines.join('\n');
    const state = this.db.getState();

    try {
      if (!state.threadId) {
        console.log(`[email] sending new thread (${lines.length} lines)`);
        const result = await this.gmail.send({
          to: this.config.FRIEND_EMAIL,
          subject: this.config.EMAIL_SUBJECT,
          body,
        });
        this.db.updateState({
          threadId: result.threadId,
          firstMessageId: result.messageId,
        });
        console.log(`[email] thread created: ${result.threadId}`);
      } else {
        console.log(`[email] sending reply (${lines.length} lines) to thread ${state.threadId}`);
        await this.gmail.send({
          to: this.config.FRIEND_EMAIL,
          subject: `Re: ${this.config.EMAIL_SUBJECT}`,
          body,
          threadId: state.threadId,
          inReplyTo: state.firstMessageId!,
        });
        console.log(`[email] reply sent`);
      }
    } catch (err) {
      console.error(`[email] send failed:`, err);
      console.error(`[email] lost lines:`, lines);
    }
  }

  private async pollEmail(): Promise<void> {
    const state = this.db.getState();
    if (!state.threadId) return;

    try {
      const messages = await this.gmail.poll(state.threadId, state.lastPollMs ?? 0);

      for (const msg of messages) {
        if (!msg.from.includes(this.config.FRIEND_EMAIL)) continue;
        if (this.db.isEmailProcessed(msg.id)) continue;

        const stripped = stripQuotedReply(msg.body);
        const formatted = formatLine(`${this.config.FRIEND_NAME} via email`, stripped);
        console.log(`[poll] forwarding to WA: ${formatted}`);
        await this.wa.sendMessage(this.config.WA_GROUP_JID, { text: formatted });
        this.db.markEmailProcessed(msg.id);
      }

      this.db.updateState({ lastPollMs: Date.now() });
    } catch (err) {
      console.error(`[poll] failed:`, err);
    }
  }
}
