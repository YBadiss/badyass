import { parseConfig } from './config.js';
import { DB } from './db.js';
import path from 'path';

const config = parseConfig();
const db = new DB(path.join(config.STORE_PATH, 'bridge.db'));

console.log('Current state:', db.getState());
db.updateState({ threadId: null, firstMessageId: null, lastPollMs: null });
console.log('State reset. Next message will start a new email thread.');
db.close();
