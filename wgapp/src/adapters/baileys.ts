import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} from '@whiskeysockets/baileys';
import type { WASocket } from '@whiskeysockets/baileys';
import P from 'pino';
import type { WAPort, WAIncomingMessage } from '../ports.js';

export class BaileysWAAdapter implements WAPort {
  private sock: WASocket | null = null;
  private handler: ((msg: WAIncomingMessage) => void) | null = null;
  private authStorePath: string;
  private logger = P({ level: 'silent' });

  constructor(authStorePath: string) {
    this.authStorePath = authStorePath;
  }

  async connect(): Promise<void> {
    const { state, saveCreds } = await useMultiFileAuthState(this.authStorePath);
    const { version } = await fetchLatestBaileysVersion();

    this.sock = makeWASocket({
      version,
      logger: this.logger,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, this.logger),
      },
    });

    this.sock.ev.on('creds.update', saveCreds);

    this.sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect } = update;
      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        if (statusCode === DisconnectReason.loggedOut) {
          console.error('Logged out — re-pair required. Exiting.');
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
