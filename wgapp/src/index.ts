import { parseConfig } from './config.js';
import { DB } from './db.js';
import { Bridge } from './bridge.js';
import { BaileysWAAdapter } from './adapters/baileys.js';
import { GmailAPIAdapter } from './adapters/gmail-api.js';
import path from 'path';

const config = parseConfig();

if (!config.WA_GROUP_JID) {
  console.log('No WA_GROUP_JID set. Run: npx tsx src/list-groups.ts');
  process.exit(0);
}

const dbPath = path.join(config.STORE_PATH, 'bridge.db');
const db = new DB(dbPath);

const wa = new BaileysWAAdapter(
  path.join(config.STORE_PATH, 'wa-auth'),
);

const gmail = new GmailAPIAdapter(
  config.GMAIL_CLIENT_ID,
  config.GMAIL_CLIENT_SECRET,
  config.GMAIL_REFRESH_TOKEN,
  config.GMAIL_ADDRESS,
);

const bridge = new Bridge(wa, gmail, db, config);

await wa.connect();
bridge.start();
bridge.startPolling();
console.log('Bridge running.');

const shutdown = async () => {
  console.log('Shutting down...');
  await bridge.stop();
  db.close();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
