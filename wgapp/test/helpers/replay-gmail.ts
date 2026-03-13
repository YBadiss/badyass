import type { GmailPort, GmailMessage } from '../../src/ports.js';

interface SendResponse {
  threadId: string;
  messageId: string;
}

export class ReplayGmailPort implements GmailPort {
  private sendQueue: SendResponse[];
  private pollQueue: GmailMessage[][];
  public sentEmails: Array<{
    to: string;
    subject: string;
    body: string;
    threadId?: string;
    inReplyTo?: string;
  }> = [];

  constructor(opts?: { send?: SendResponse[]; poll?: GmailMessage[][] }) {
    this.sendQueue = opts?.send ? [...opts.send] : [];
    this.pollQueue = opts?.poll ? [...opts.poll] : [];
  }

  async send(opts: {
    to: string;
    subject: string;
    body: string;
    threadId?: string;
    inReplyTo?: string;
  }): Promise<SendResponse> {
    this.sentEmails.push(opts);
    if (this.sendQueue.length > 0) {
      return this.sendQueue.shift()!;
    }
    return {
      threadId: `generated-thread-${this.sentEmails.length}`,
      messageId: `generated-msg-${this.sentEmails.length}`,
    };
  }

  async poll(_threadId: string, _afterMs: number): Promise<GmailMessage[]> {
    if (this.pollQueue.length > 0) {
      return this.pollQueue.shift()!;
    }
    return [];
  }
}
