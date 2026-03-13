export interface WAIncomingMessage {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
    participant?: string;
  };
  pushName?: string;
  message?: Record<string, unknown>;
}

export interface GmailMessage {
  id: string;
  from: string;
  body: string;
}

export interface WAPort {
  onMessage(handler: (msg: WAIncomingMessage) => void): void;
  sendMessage(jid: string, content: { text: string }): Promise<void>;
}

export interface GmailPort {
  send(opts: {
    to: string;
    subject: string;
    body: string;
    threadId?: string;
    inReplyTo?: string;
  }): Promise<{ threadId: string; messageId: string }>;
  poll(threadId: string, afterMs: number): Promise<GmailMessage[]>;
}
