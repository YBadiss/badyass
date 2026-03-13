import type { WAPort, WAIncomingMessage } from '../../src/ports.js';

export class ReplayWAPort implements WAPort {
  private handler: ((msg: WAIncomingMessage) => void) | null = null;
  public sentMessages: Array<{ jid: string; text: string }> = [];

  onMessage(handler: (msg: WAIncomingMessage) => void): void {
    this.handler = handler;
  }

  async sendMessage(jid: string, content: { text: string }): Promise<void> {
    this.sentMessages.push({ jid, text: content.text });
  }

  replay(messages: WAIncomingMessage[]): void {
    for (const msg of messages) {
      this.handler?.(msg);
    }
  }
}
