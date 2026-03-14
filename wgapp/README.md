# wgapp — WhatsApp ↔ Email Bridge

A single Node.js process that forwards messages from a WhatsApp group to a friend's inbox (as one continuous email thread) and relays their email replies back to the group.

## How it works

```
WhatsApp Group ──► Bridge ──► Friend's Email
                    ▲              │
                    └──────────────┘
                     (replies via email)
```

- **WA → Email**: Group messages are extracted, formatted (`[Alice]: hey!`), debounced (30s of inactivity or 20 messages), and sent as a single email. All emails land in one Gmail thread.
- **Email → WA**: Every 60s, the bridge polls for new replies from the friend, strips quoted history, and forwards clean text back to the group as `[John via email]: reply`.

### What gets forwarded

| Message type | Output |
|---|---|
| Text, links | Forwarded as-is |
| Quoted replies | `> original text` + reply |
| Polls | `📊 Poll: Question` + numbered options |
| Location | Google Maps link |
| Images, videos, audio, stickers, docs | Placeholder (`[sent an image]`, etc.) |
| Reactions, poll votes, edits, deletes | Skipped |

## Prerequisites

- Node.js 20+
- A Gmail account with a [Google Cloud project](https://console.cloud.google.com/)
- A WhatsApp account (will be linked as a multi-device client)

## Setup

### 1. Install dependencies

```bash
cd wgapp
npm install
```

### 2. Configure Gmail OAuth2

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Enable the **Gmail API**
2. Create an **OAuth 2.0 Client ID** (Web application type)
3. Add `http://localhost:3000/callback` as an authorized redirect URI
4. Copy `client_id` and `client_secret` into `.env`

Then run the auth setup script:

```bash
npx tsx src/auth-setup.ts
```

This opens your browser, you authorize with Gmail, and the refresh token is saved to `.env` automatically. Scopes requested:
- `https://www.googleapis.com/auth/gmail.send`
- `https://www.googleapis.com/auth/gmail.readonly`

### 3. Create `.env`

```bash
cp .env.example .env
```

Fill in all values:

```bash
# WhatsApp
WA_GROUP_JID=               # use list-groups script below

# Gmail OAuth2
GMAIL_ADDRESS=you@gmail.com
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REFRESH_TOKEN=...     # use auth-setup script above

# Bridge
FRIEND_EMAIL=friend@example.com
FRIEND_NAME=John
EMAIL_SUBJECT="WhatsApp Group Thread"
POLL_INTERVAL_MS=60000
DEBOUNCE_MS=30000
DEBOUNCE_MAX_BATCH=20
STORE_PATH=./store
```

### 4. Discover your group JID

```bash
npx tsx src/list-groups.ts
```

This connects to WhatsApp via pairing code, lists your groups, and writes the selected JID to `.env`.

### 5. Run

```bash
npx tsx src/index.ts
```

### Utility scripts

```bash
npm run reset-thread   # clear email thread state, next message starts a fresh thread
```

## Development

```bash
npm run dev          # watch mode (tsx watch)
npm run build        # typecheck (tsc --noEmit)
npm test             # run tests once
npm run test:watch   # vitest watch mode
```

## Testing

Tests use recorded fixtures (Baileys message payloads, Gmail API responses) replayed through the bridge core via interface substitution — no mocking libraries, no live services. SQLite uses `:memory:` databases per test.

```bash
npm test    # 66 tests across 6 files
```

## Architecture

The bridge core (`bridge.ts`) depends on two interfaces — `WAPort` and `GmailPort` — not on Baileys or googleapis directly. Production wiring (`index.ts`) injects real adapters. Tests inject replay adapters. All message filtering logic lives in the bridge, not in adapters.

```
src/
├── index.ts            # entry point, wires adapters
├── bridge.ts           # orchestrator: WA↔Email logic
├── ports.ts            # WAPort + GmailPort interfaces
├── adapters/
│   ├── baileys.ts      # WhatsApp adapter (thin wrapper)
│   └── gmail-api.ts    # Gmail adapter (thin wrapper)
├── extract.ts          # WA message → string
├── format.ts           # formatLine(), stripQuotedReply()
├── debounce.ts         # batches messages before sending
├── db.ts               # SQLite state + dedup
├── config.ts           # zod-validated env vars
├── list-groups.ts      # WA group discovery script
├── auth-setup.ts       # Gmail OAuth2 setup script
└── reset-thread.ts     # reset email thread state
```

## Deployment

Follows the same blue-green pattern as other badyass.xyz projects: timestamped directories on the server, symlink swap, PM2 restart.

```bash
npm run deploy    # rsync, npm ci on server, swap symlink, restart PM2
```

### How state works

Persistent state lives in `/var/www/badyass.xyz/wgapp-store/`, outside deployment directories:

```
wgapp-store/
├── .env          # config (Gmail creds, WA group JID, etc.)
├── wa-auth/      # Baileys session (WA pairing keys)
└── bridge.db     # email thread state + dedup
```

Deploys never touch this directory, so WA pairing and email thread state survive across deployments.

PM2 sets `STORE_PATH=/var/www/badyass.xyz/wgapp-store` and `DOTENV_CONFIG_PATH` pointing to the store's `.env` (see `ecosystem.config.cjs`). These override whatever is in the `.env` file, so `STORE_PATH=./store` in your local `.env` is fine — it only applies during local development.

### First-time server setup

1. **Install global dependencies on the server:**
   ```bash
   ssh root@167.71.143.97 "mkdir -p /var/www/badyass.xyz/wgapp-store && npm i -g pm2 tsx"
   ```

2. **Complete local setup first** — pair WhatsApp (`npx tsx src/list-groups.ts`), set up Gmail OAuth (`npx tsx src/auth-setup.ts`), and verify the bridge works locally.

3. **Copy local state to the server:**
   ```bash
   scp .env root@167.71.143.97:/var/www/badyass.xyz/wgapp-store/.env
   scp -r store/wa-auth root@167.71.143.97:/var/www/badyass.xyz/wgapp-store/wa-auth
   ```
   The Baileys auth session is portable — no need to re-pair on the server.

4. **Deploy and start:**
   ```bash
   npm run deploy
   ssh root@167.71.143.97 "pm2 save && pm2 startup"
   ```

### Subsequent deploys

```bash
npm run deploy    # or just push to main
```

Code is swapped and PM2 restarts. State in `wgapp-store/` is untouched.

### CI/CD

Pushes to `main` that touch `wgapp/**` trigger automatic deployment via GitHub Actions (`.github/workflows/deploy-wgapp.yml`). Old deployments are cleaned up automatically (keeps last 3).
