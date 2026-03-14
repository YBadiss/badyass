import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} from '@whiskeysockets/baileys';
import P from 'pino';
import dotenv from 'dotenv';
import path from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import readline from 'readline';

dotenv.config();

const storePath = process.env.STORE_PATH ?? './store';
const authPath = path.join(storePath, 'wa-auth');
mkdirSync(authPath, { recursive: true });

const logger = P({ level: 'silent' });

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q: string) => new Promise<string>((resolve) => rl.question(q, resolve));

const phone = await ask('Enter your WhatsApp phone number (e.g. 33612345678, no + prefix): ');

const { state, saveCreds } = await useMultiFileAuthState(authPath);

async function start() {
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
  });

  sock.ev.process(async (events) => {
    if (events['creds.update']) {
      await saveCreds();
    }

    if (events['connection.update']) {
      const { connection, lastDisconnect, qr } = events['connection.update'];

      if (qr && !sock.authState.creds.registered) {
        try {
          const code = await sock.requestPairingCode(phone.trim());
          console.log(`\nPairing code: ${code}\n`);
          console.log('Go to WhatsApp → Linked Devices → Link a Device → Link with phone number');
          console.log('Enter the pairing code above, then wait...\n');
        } catch (err) {
          console.error('Failed to get pairing code:', (err as Error).message);
        }
      }

      if (connection === 'open') {
        console.log('Connected! Fetching groups...\n');

        const groups = await sock.groupFetchAllParticipating();
        const entries = Object.values(groups);

        if (entries.length === 0) {
          console.log('No groups found.');
          rl.close();
          process.exit(0);
        }

        entries.forEach((g, i) => {
          const memberCount = g.participants?.length ?? '?';
          console.log(`  ${i + 1}. ${g.subject} (${g.id}) — ${memberCount} members`);
        });

        const answer = await ask('\nPick a group (number): ');
        const idx = parseInt(answer, 10) - 1;
        if (idx < 0 || idx >= entries.length) {
          console.error('Invalid selection.');
          rl.close();
          process.exit(1);
        }

        const jid = entries[idx].id;
        console.log(`\nSelected: ${entries[idx].subject} → ${jid}`);

        const envPath = '.env';
        if (existsSync(envPath)) {
          let envContent = readFileSync(envPath, 'utf-8');
          if (envContent.match(/^WA_GROUP_JID=.*/m)) {
            envContent = envContent.replace(/^WA_GROUP_JID=.*/m, `WA_GROUP_JID=${jid}`);
          } else {
            envContent += `\nWA_GROUP_JID=${jid}\n`;
          }
          writeFileSync(envPath, envContent);
          console.log('Written to .env');
        }

        rl.close();
        sock.end(undefined);
        process.exit(0);
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        if (statusCode === DisconnectReason.loggedOut) {
          console.error('Logged out. Delete store/wa-auth and try again.');
          rl.close();
          process.exit(1);
        }
        start();
      }
    }
  });
}

start();
