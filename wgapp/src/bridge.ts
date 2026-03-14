import type { WAPort, GmailPort, WAIncomingMessage } from './ports.js';
import type { DB } from './db.js';
import type { Config } from './config.js';
import { extractContent } from './extract.js';
import { formatLine, stripQuotedReply } from './format.js';

export class Bridge {
  private outboxInterval: ReturnType<typeof setInterval> | null = null;
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private wa: WAPort,
    private gmail: GmailPort,
    private db: DB,
    private config: Config,
  ) {}

  start(): void {
    console.log('[bridge] started, listening for WA messages');
    this.wa.onMessage((msg) => this.handleWAMessage(msg));

    // Flush any messages left in outbox from a previous crash
    const pending = this.db.outboxCount();
    if (pending > 0) {
      console.log(`[bridge] found ${pending} pending outbox messages, flushing`);
      this.flushToEmail();
    }

    // Send outbox every WA_OUTBOX_DELAY_MS (if there are pending messages)
    console.log(`[bridge] outbox flush every ${this.config.WA_OUTBOX_DELAY_MS}ms`);
    this.outboxInterval = setInterval(() => this.flushToEmail(), this.config.WA_OUTBOX_DELAY_MS);
  }

  startPolling(): void {
    console.log(`[bridge] polling email every ${this.config.POLL_INTERVAL_MS}ms`);
    this.pollInterval = setInterval(() => this.pollEmail(), this.config.POLL_INTERVAL_MS);
  }

  async stop(): Promise<void> {
    if (this.outboxInterval) {
      clearInterval(this.outboxInterval);
      this.outboxInterval = null;
    }
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    await this.flushToEmail();
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
    // Format is: [HH:MM] [Name via email]: text
    const bridgeTag = `[${this.config.FRIEND_NAME} via email]:`;
    if (msg.key.fromMe && content.includes(bridgeTag)) {
      console.log(`[wa] skipped: bridge echo`);
      return;
    }

    const sender = msg.pushName ?? 'Unknown';
    const line = formatLine(sender, content);
    console.log(`[wa] buffered: ${line}`);
    this.db.pushOutbox(line);

    // Force flush if outbox is full
    if (this.db.outboxCount() >= this.config.WA_OUTBOX_MAX_MESSAGES) {
      this.flushToEmail();
    }
  }

  private async flushToEmail(): Promise<void> {
    const rows = this.db.readOutbox();
    if (rows.length === 0) return;

    const lines = rows.map((r) => r.line);
    const ids = rows.map((r) => r.id);
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
        // Email sent successfully — delete outbox + update state in one transaction
        this.db.transaction(() => {
          this.db.deleteOutbox(ids);
          this.db.updateState({
            threadId: result.threadId,
            firstMessageId: result.messageId,
          });
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
        // Email sent successfully — delete outbox
        this.db.deleteOutbox(ids);
        console.log(`[email] reply sent`);
      }
    } catch (err) {
      console.error(`[email] send failed, ${lines.length} messages kept in outbox:`, err);
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
