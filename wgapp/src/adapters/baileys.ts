import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
} from '@whiskeysockets/baileys';
import type { WASocket } from '@whiskeysockets/baileys';
import type { WAPort, WAIncomingMessage } from '../ports.js';

export class BaileysWAAdapter implements WAPort {
  private sock: WASocket | null = null;
  private handler: ((msg: WAIncomingMessage) => void) | null = null;
  private authStorePath: string;
  private groupJid: string;

  constructor(authStorePath: string, groupJid: string) {
    this.authStorePath = authStorePath;
    this.groupJid = groupJid;
  }

  async connect(): Promise<void> {
    const { state, saveCreds } = await useMultiFileAuthState(this.authStorePath);

    this.sock = makeWASocket({
      auth: state,
      printQRInTerminal: true,
    });

    this.sock.ev.on('creds.update', saveCreds);

    this.sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect } = update;
      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        if (statusCode === DisconnectReason.loggedOut) {
          console.error('Logged out — re-scan QR required. Exiting.');
          process.exit(1);
        }
        console.warn(`Connection closed (status ${statusCode}). Reconnecting...`);
        this.connect();
      } else if (connection === 'open') {
        console.log('Connected to WhatsApp');
      }
    });

    this.sock.ev.on('messages.upsert', ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const msg of messages) {
        if (msg.key.fromMe) continue;
        if (this.groupJid && msg.key.remoteJid !== this.groupJid) {
          if (!this.groupJid) {
            console.log(`[discovery] JID: ${msg.key.remoteJid} from ${msg.pushName}`);
          }
          continue;
        }
        if (this.handler) {
          this.handler(msg as unknown as WAIncomingMessage);
        }
      }
    });
  }

  onMessage(handler: (msg: WAIncomingMessage) => void): void {
    this.handler = handler;
  }

  async sendMessage(jid: string, content: { text: string }): Promise<void> {
    if (!this.sock) throw new Error('Not connected');
    await this.sock.sendMessage(jid, content);
  }
}
