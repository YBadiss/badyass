import Database from 'better-sqlite3';

export interface State {
  threadId: string | null;
  firstMessageId: string | null;
  lastPollMs: number | null;
}

export class DB {
  private db: Database.Database;

  constructor(filePath: string) {
    this.db = new Database(filePath);
    this.db.pragma('journal_mode = WAL');
    this.init();
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS state (
        id              INTEGER PRIMARY KEY CHECK (id = 1),
        gmail_thread_id TEXT,
        first_message_id TEXT,
        last_poll_ms    INTEGER
      );
      INSERT OR IGNORE INTO state (id) VALUES (1);

      CREATE TABLE IF NOT EXISTS processed_emails (
        gmail_msg_id  TEXT PRIMARY KEY,
        processed_at  INTEGER NOT NULL
      );
    `);
  }

  getState(): State {
    const row = this.db
      .prepare('SELECT gmail_thread_id, first_message_id, last_poll_ms FROM state WHERE id = 1')
      .get() as { gmail_thread_id: string | null; first_message_id: string | null; last_poll_ms: number | null };

    return {
      threadId: row.gmail_thread_id,
      firstMessageId: row.first_message_id,
      lastPollMs: row.last_poll_ms,
    };
  }

  updateState(patch: Partial<State>): void {
    const current = this.getState();
    const threadId = patch.threadId !== undefined ? patch.threadId : current.threadId;
    const firstMessageId = patch.firstMessageId !== undefined ? patch.firstMessageId : current.firstMessageId;
    const lastPollMs = patch.lastPollMs !== undefined ? patch.lastPollMs : current.lastPollMs;

    this.db
      .prepare('UPDATE state SET gmail_thread_id = ?, first_message_id = ?, last_poll_ms = ? WHERE id = 1')
      .run(threadId, firstMessageId, lastPollMs);
  }

  isEmailProcessed(gmailMsgId: string): boolean {
    const row = this.db
      .prepare('SELECT 1 FROM processed_emails WHERE gmail_msg_id = ?')
      .get(gmailMsgId);
    return row !== undefined;
  }

  markEmailProcessed(gmailMsgId: string): void {
    this.db
      .prepare('INSERT OR IGNORE INTO processed_emails (gmail_msg_id, processed_at) VALUES (?, ?)')
      .run(gmailMsgId, Date.now());
  }

  close(): void {
    this.db.close();
  }
}
