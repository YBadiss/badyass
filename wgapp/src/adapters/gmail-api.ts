import { google } from 'googleapis';
import type { GmailPort, GmailMessage } from '../ports.js';

export class GmailAPIAdapter implements GmailPort {
  private gmail;

  constructor(clientId: string, clientSecret: string, refreshToken: string, userEmail: string) {
    const auth = new google.auth.OAuth2(clientId, clientSecret);
    auth.setCredentials({ refresh_token: refreshToken });
    this.gmail = google.gmail({ version: 'v1', auth });
    // userEmail stored for potential future use (e.g. From header)
    this.userEmail = userEmail;
  }

  private userEmail: string;

  async send(opts: {
    to: string;
    subject: string;
    body: string;
    threadId?: string;
    inReplyTo?: string;
  }): Promise<{ threadId: string; messageId: string }> {
    const headers = [
      `From: ${this.userEmail}`,
      `To: ${opts.to}`,
      `Subject: ${opts.subject}`,
      `Content-Type: text/plain; charset=utf-8`,
    ];

    if (opts.inReplyTo) {
      headers.push(`In-Reply-To: ${opts.inReplyTo}`);
      headers.push(`References: ${opts.inReplyTo}`);
    }

    const raw = headers.join('\r\n') + '\r\n\r\n' + opts.body;
    const encoded = Buffer.from(raw).toString('base64url');

    const res = await this.gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encoded,
        threadId: opts.threadId,
      },
    });

    // Fetch the sent message to get the RFC 2822 Message-ID header for threading
    const sent = await this.gmail.users.messages.get({
      userId: 'me',
      id: res.data.id!,
      format: 'metadata',
      metadataHeaders: ['Message-ID'],
    });
    const rfc2822Id = sent.data.payload?.headers?.find(
      (h) => h.name?.toLowerCase() === 'message-id',
    )?.value ?? res.data.id!;

    return {
      threadId: res.data.threadId!,
      messageId: rfc2822Id,
    };
  }

  async poll(threadId: string, afterMs: number): Promise<GmailMessage[]> {
    const afterDate = new Date(afterMs);
    const dateStr = `${afterDate.getFullYear()}/${String(afterDate.getMonth() + 1).padStart(2, '0')}/${String(afterDate.getDate()).padStart(2, '0')}`;

    const listRes = await this.gmail.users.messages.list({
      userId: 'me',
      q: `in:anywhere after:${dateStr}`,
      maxResults: 50,
      ...(threadId ? { q: `after:${dateStr}`, labelIds: undefined } : {}),
    });

    // Use threads.get to get all messages in the thread at once
    const threadRes = await this.gmail.users.threads.get({
      userId: 'me',
      id: threadId,
      format: 'full',
    });

    const messages: GmailMessage[] = [];
    for (const msg of threadRes.data.messages ?? []) {
      const internalDate = parseInt(msg.internalDate ?? '0', 10);
      if (internalDate < afterMs) continue;

      const fromHeader = msg.payload?.headers?.find(
        (h) => h.name?.toLowerCase() === 'from',
      )?.value ?? '';

      let body = '';
      const parts = msg.payload?.parts;
      if (parts) {
        const textPart = parts.find((p) => p.mimeType === 'text/plain');
        if (textPart?.body?.data) {
          body = Buffer.from(textPart.body.data, 'base64url').toString('utf-8');
        }
      } else if (msg.payload?.body?.data) {
        body = Buffer.from(msg.payload.body.data, 'base64url').toString('utf-8');
      }

      messages.push({ id: msg.id!, from: fromHeader, body });
    }

    return messages;
  }
}
