# WhatsApp ↔ Email Bridge

A single Node.js process that forwards messages from a WhatsApp group to a friend's inbox (as one continuous email thread) and relays their replies back to the group.

## Stack

| Concern | Choice | Why |
|---|---|---|
| WhatsApp | **Baileys** (`@whiskeysockets/baileys`) | TS-native, multi-device protocol. Known issues on Bun — stick to Node. |
| Email (send + receive) | **googleapis** (Gmail API) | One OAuth2 token handles both sending and polling. No App Password, no Nodemailer — one auth mechanism for both directions. |
| State | **better-sqlite3** | Thread ID, dedup set, checkpoint timestamp. |
| Runtime | **Node 20 LTS + tsx** | Runs TS directly, no build step. |
| Process mgmt | **PM2** | Auto-restart, survives reboots. |

## Architecture

The bridge core (`bridge.ts`) doesn't import Baileys or googleapis directly. It depends on two thin interfaces — `WAPort` and `GmailPort`. Production wiring (`index.ts`) injects real adapters. Tests inject a `ReplayWAPort` and `ReplayGmailPort` that return recorded fixtures. No mocking libraries involved — just interface substitution.

```
┌──────────────────── Node.js Process ────────────────────┐
│                                                          │
│   WAPort adapter       ◄──────►  GmailPort adapter      │
│     • onMessage()                  • send()              │
│     • sendMessage()                • poll()              │
│                  │                       │                │
│                  └───── SQLite DB ───────┘                │
│                    state row · dedup · checkpoint          │
└──────────────────────────────────────────────────────────┘
        ▲ WebSocket                        ▲ HTTPS
        ▼                                  ▼
  WhatsApp Group                     Friend's Inbox
```

```typescript
// src/ports.ts
interface WAPort {
  onMessage(handler: (msg: WAIncomingMessage) => void): void;
  sendMessage(jid: string, content: { text: string }): Promise<void>;
}

interface GmailPort {
  send(opts: {
    to: string; subject: string; body: string;
    threadId?: string; inReplyTo?: string;
  }): Promise<{ threadId: string; messageId: string }>;
  // afterMs is Unix-ms. The adapter converts to Gmail's after:YYYY/MM/DD format.
  // Day-level granularity means some re-fetching — dedup table is the real filter.
  poll(threadId: string, afterMs: number): Promise<GmailMessage[]>;
}
```

## Message Flows

### WA → Email

1. Baileys fires `messages.upsert`.
2. **Filter**: only messages where `remoteJid === GROUP_JID` and `!fromMe`. Ignore everything else. (Note: the Baileys adapter pre-filters these for performance, but the bridge core should also guard against them for defense in depth — the replay tests verify this second layer.)
3. **Extract content** based on message type (see Message Type Handling below). If the type is unsupported, skip silently.
4. Format line: `[Sender Name]: extracted content`.
5. **Push into the debounce buffer** (see Debounce Window below) instead of sending immediately.
6. When the buffer flushes, join all buffered lines with newlines into a single email body.
7. If no thread exists yet → send a new email via Gmail API, store the returned `threadId` and `Message-ID` header.
8. If thread exists → send as a reply (set `In-Reply-To` and `References` headers to the first `Message-ID`).

### Email → WA

1. Every 60 s, poll Gmail API: `messages.list` with `threadId` as a parameter (not in the query string) and `q: "after:YYYY/MM/DD"` based on the checkpoint timestamp. (Day-level granularity means some re-fetching within the same day — the `processed_emails` dedup table is the real filter.)
2. For each new message **from the friend's address** (ignore your own sends):
   - Skip if `gmail_message_id` already in the `processed_emails` table (dedup).
   - Extract the plain-text body. Strip quoted reply history (everything below a line starting `On ... wrote:` or `>`) so the group doesn't see the full chain.
   - Send to WA group: `[Friend Name via email]: reply text`.
3. Update checkpoint timestamp and mark messages as processed.

### Debounce Window

Instead of firing one email per WA message, buffer messages for **30 seconds** of inactivity. The logic:

1. When a message arrives, push it to an in-memory array and reset a 30 s timer.
2. If another message arrives within 30 s, push it and reset the timer again.
3. When the timer fires (30 s of silence), flush the buffer: join all lines into one email body and send.
4. Safety cap: if the buffer reaches **20 messages** before the timer fires, flush immediately. This prevents a very active conversation from being silently held for minutes.

The `WA_OUTBOX_DELAY_MS` and `WA_OUTBOX_MAX_MESSAGES` values go in `.env` so you can tune without code changes.

### Message Type Handling

Baileys delivers all WA message types. Here's how the bridge handles each:

| WA message type | Baileys field | Bridge behavior | Email output |
|---|---|---|---|
| **Plain text** | `conversation` | Forward as-is | `[Alice]: hey, are we meeting tomorrow?` |
| **Text with link preview** | `extendedTextMessage.text` | Forward the text (URL is inline). Ignore preview metadata (title/thumbnail) — email clients make their own previews. | `[Bob]: check this out https://example.com` |
| **Reply/quote** | `extendedTextMessage` with `contextInfo.quotedMessage` | Forward the reply text. Optionally prefix with a short quote indicator. | `[Alice]: > hey, are we meeting tomorrow?\nYes, 6pm works` |
| **Poll creation** | `pollCreationMessage` | Format as question + numbered options. | `[Bob]: 📊 Poll: Where should we eat?\n1. Thai\n2. Pizza\n3. Sushi` |
| **Poll vote** | `pollUpdateMessage` | **Skip.** Votes are encrypted per-voter and noisy to forward. Not worth the complexity. | — |
| **Reaction** | `reactionMessage` | **Skip.** Forwarding every 👍 would be pure spam. | — |
| **Image** | `imageMessage` | Placeholder (v1). Include caption if present. | `[Alice]: [sent an image]` or `[sent an image: look at this]` |
| **Video** | `videoMessage` | Placeholder (v1). Include caption if present. | `[Bob]: [sent a video]` or `[sent a video: check this out]` |
| **Audio/voice note** | `audioMessage` | Placeholder (v1). | `[Alice]: [sent a voice note]` |
| **Sticker** | `stickerMessage` | Placeholder (v1). | `[Bob]: [sent a sticker]` |
| **GIF** | `videoMessage` (flagged `gifPlayback`) | Placeholder (v1). | `[Alice]: [sent a GIF]` |
| **Document/file** | `documentMessage` | Placeholder (v1). Include filename if available. | `[Bob]: [sent a file: report.pdf]` |
| **Location** | `locationMessage` | Convert lat/lng to a Google Maps link. | `[Alice]: 📍 https://maps.google.com/?q=48.8566,2.3522` |
| **Live location** | `liveLocationMessage` | Forward the initial point as a static Maps link. Ignore updates. | `[Bob]: 📍 Live location: https://maps.google.com/?q=...` |
| **Contact (vCard)** | `contactMessage` | Forward name and phone if available. | `[Alice]: [shared contact: Jane Doe, +33...]` |
| **Message edit** | `protocolMessage` (type `MESSAGE_EDIT`) | **Skip** (v1). Edits won't retroactively update the email. | — |
| **Message delete** | `protocolMessage` (type `REVOKE`) | **Skip.** Can't un-send an email. | — |
| **Disappearing messages** | Normal messages with TTL in `contextInfo` | Forward normally. Note: this breaks ephemerality — the message becomes permanent in email. Acceptable for a friend group. | (same as the underlying type) |

The extraction logic is a single function with a `switch`-like chain: check for `conversation`, then `extendedTextMessage`, then `imageMessage`, etc. Unknown types fall through to `null` → silently skipped.

## SQLite Schema

```sql
CREATE TABLE state (
  id              INTEGER PRIMARY KEY CHECK (id = 1),  -- single row
  gmail_thread_id TEXT,        -- thread to poll / reply into
  first_message_id TEXT,       -- Message-ID header of the first email (for threading headers)
  last_poll_ms    INTEGER      -- Unix-ms checkpoint for polling
);
INSERT OR IGNORE INTO state (id) VALUES (1);
-- (wa_group_jid lives in .env only — no need to duplicate in DB)

CREATE TABLE processed_emails (
  gmail_msg_id  TEXT PRIMARY KEY,
  processed_at  INTEGER NOT NULL  -- Unix ms
);
```

Access is `db.getState()` → `{ threadId, firstMessageId, lastPollMs }` and `db.updateState({ threadId?, firstMessageId?, lastPollMs? })`. Typed columns instead of stringly-typed kv lookups.

## Project Structure

```
wgapp/
├── .env                    # secrets (gitignored)
├── .env.example
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── deploy.sh               # blue-green deploy via SCP (same pattern as home/facet)
├── cleanup_deploys.sh      # removes old timestamped deployments, keeps last 2
├── ecosystem.config.cjs    # PM2 config (runs on the server)
├── src/
│   ├── index.ts            # wires real adapters + DB, starts poll loop
│   ├── bridge.ts           # core logic: takes WAPort + GmailPort + DB
│   ├── ports.ts            # WAPort and GmailPort interfaces
│   ├── adapters/
│   │   ├── baileys.ts      # BaileysWAAdapter implements WAPort
│   │   └── gmail-api.ts    # GmailAPIAdapter implements GmailPort
│   ├── extract.ts          # extractContent(): WA message → string | null
│   ├── format.ts           # formatLine(), stripQuotedReply()
│   ├── debounce.ts         # DebounceBuffer class
│   ├── db.ts               # better-sqlite3 wrapper
│   └── config.ts           # zod-validated env vars
├── test/
│   ├── fixtures/
│   │   ├── wa-messages/    # recorded Baileys message objects (JSON)
│   │   └── gmail-responses/# hand-built Gmail API responses (JSON)
│   ├── helpers/
│   │   ├── replay-wa.ts    # ReplayWAPort: feeds fixtures as events
│   │   └── replay-gmail.ts # ReplayGmailPort: returns fixtures from send/poll
│   ├── record.ts           # script to capture live WA fixtures (committed)
│   ├── config.test.ts      # config validation tests
│   ├── db.test.ts          # SQLite state + dedup tests
│   ├── extract.test.ts     # message extraction per fixture
│   ├── format.test.ts      # formatLine, stripQuotedReply
│   ├── debounce.test.ts    # fake-timer debounce tests
│   └── bridge.test.ts      # integration: full WA↔Email pipeline
└── store/                  # lives on the server, NOT in the deployed directory
    ├── bridge.db           # SQLite (gitignored)
    └── wa-auth/            # Baileys session (gitignored)
```

## Secrets & Setup

### `.env`

```bash
# WhatsApp
WA_GROUP_JID=               # discovered on first run (see below)

# Gmail OAuth2 (used for both send and receive)
GMAIL_ADDRESS=you@gmail.com
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REFRESH_TOKEN=

# Bridge
FRIEND_EMAIL=friend@example.com
FRIEND_NAME=John
EMAIL_SUBJECT="WhatsApp Group Thread"
POLL_INTERVAL_MS=60000
WA_OUTBOX_DELAY_MS=30000
WA_OUTBOX_MAX_MESSAGES=20
STORE_PATH=./store            # production: /var/www/badyass.xyz/wgapp-store
```

### How to get each value

**Gmail OAuth2 credentials** (one-time):

1. Create a project at console.cloud.google.com.
2. Enable the **Gmail API**.
3. Create an **OAuth 2.0 Client ID** (Desktop app type).
4. Copy `client_id` and `client_secret` into `.env`.
5. Run a one-time auth script (include as `src/auth-setup.ts`): it opens a browser, you log in and grant `https://www.googleapis.com/auth/gmail.send` + `https://www.googleapis.com/auth/gmail.readonly` scopes, it prints the `refresh_token`. Paste into `.env`. This token doesn't expire unless revoked.

**WhatsApp Group JID**:

On first run, leave `WA_GROUP_JID` blank. The bridge logs every incoming message's `remoteJid`. Find the one matching your group (format: `XXXXXXXXXX-XXXXXXXXXX@g.us`), paste it in, restart. Optionally, ship a `list-groups.ts` helper that dumps all groups with names + JIDs.

**Baileys session**:

First run shows a QR code in the terminal. Scan it with WhatsApp → Linked Devices. Session persists in `store/wa-auth/`. Don't use WhatsApp Web in a browser at the same time — multiple linked web clients can cause disconnects.

## Deployment

Follows the same blue-green pattern as other badyass.xyz projects (home, facet): timestamped directories on the server, symlink swap, old deploys cleaned up.

The key difference from static projects: wgapp is a long-running Node.js process managed by PM2 on the server, so the deploy script also restarts the PM2 process after the symlink swap.

### Server structure

```
/var/www/badyass.xyz/
├── wgapp -> wgapp-1234567890/   # symlink to current deployment
├── wgapp-1234567890/            # timestamped deployment (code + node_modules)
└── wgapp-store/                 # persistent data (NOT inside deployments)
    ├── bridge.db                # SQLite state
    ├── wa-auth/                 # Baileys session files
    └── .env                     # secrets
```

The `store/` directory lives outside the deployment directories so that SQLite state and the Baileys session survive deploys. The app reads `STORE_PATH` from `.env` to locate it.

### deploy.sh

```bash
#!/bin/bash
SSH_OPTIONS="$@"

npm run build   # typecheck (no bundle needed — tsx runs TS directly)

timestamp=$(date +%s)
TARGET="wgapp-${timestamp}"

ssh $SSH_OPTIONS root@167.71.143.97 "mkdir -p /var/www/badyass.xyz/${TARGET} && chmod 755 /var/www/badyass.xyz/${TARGET}"

# Deploy source + package files
scp $SSH_OPTIONS -r src/ root@167.71.143.97:/var/www/badyass.xyz/${TARGET}/
scp $SSH_OPTIONS package*.json tsconfig.json ecosystem.config.cjs root@167.71.143.97:/var/www/badyass.xyz/${TARGET}/

# Install production dependencies on server
ssh $SSH_OPTIONS root@167.71.143.97 "cd /var/www/badyass.xyz/${TARGET} && npm ci --omit=dev"

# Swap symlink
ssh $SSH_OPTIONS root@167.71.143.97 "(rm /var/www/badyass.xyz/wgapp || true) && ln -s /var/www/badyass.xyz/${TARGET} /var/www/badyass.xyz/wgapp"

# Restart PM2 process
ssh $SSH_OPTIONS root@167.71.143.97 "cd /var/www/badyass.xyz/wgapp && pm2 restart ecosystem.config.cjs || pm2 start ecosystem.config.cjs"
```

### cleanup_deploys.sh

```bash
#!/bin/bash
SSH_OPTIONS="$@"

ssh $SSH_OPTIONS root@167.71.143.97 '
  cd /var/www/badyass.xyz
  ls -d wgapp-* 2>/dev/null | sort -t- -k2 -n | head -n -2 | while read dir; do
    echo "Removing old deployment: $dir"
    rm -rf "$dir"
  done
'
```

### package.json scripts

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "deploy": "bash deploy.sh && bash cleanup_deploys.sh"
  }
}
```

### CI/CD — GitHub Actions

A workflow at `.github/workflows/deploy-wgapp.yml` triggers on pushes to `main` that touch `wgapp/**`, following the same pattern as `deploy-home.yml` and `deploy-facet.yml`:

```yaml
name: Deploy WGApp

on:
  push:
    branches: [main]
    paths: [wgapp/**]

jobs:
  deploy:
    name: Deploy WGApp
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: 'wgapp/package-lock.json'
      - uses: webfactory/ssh-agent@a6f90b1f127823b31d4d4a8d96047790581349bd
        with:
          ssh-private-key: ${{ secrets.SSH_DEPLOY_KEY }}
      - name: Add server to known hosts
        run: |
          mkdir -p ~/.ssh
          ssh-keyscan -H 167.71.143.97 >> ~/.ssh/known_hosts
      - name: Deploy WGApp
        run: |
          cd wgapp
          npm ci
          npm run deploy
```

### ecosystem.config.cjs

```js
module.exports = {
  apps: [{
    name: 'wgapp',
    cwd: '/var/www/badyass.xyz/wgapp',
    script: 'npx',
    args: 'tsx src/index.ts',
    restart_delay: 5000,
    max_restarts: 10,
    env: {
      NODE_ENV: 'production',
      DOTENV_CONFIG_PATH: '/var/www/badyass.xyz/wgapp-store/.env',
      STORE_PATH: '/var/www/badyass.xyz/wgapp-store'
    }
  }]
};
```

### First-time server setup (one-time, manual)

```bash
# On the server
mkdir -p /var/www/badyass.xyz/wgapp-store/wa-auth
npm i -g pm2
pm2 startup   # follow the printed command

# Copy .env to the persistent store
scp .env root@167.71.143.97:/var/www/badyass.xyz/wgapp-store/.env

# First deploy (need to do QR scan interactively)
cd /var/www/badyass.xyz/wgapp
npx tsx src/index.ts   # scan QR, discover group JID, Ctrl+C
# Edit /var/www/badyass.xyz/wgapp-store/.env with the group JID
pm2 start ecosystem.config.cjs
pm2 save
```

## Testing

### Philosophy

Record real Baileys and Gmail API responses once, replay them in tests. The bridge core sees the same data it would in production — the only difference is where it comes from. No mocking libraries, no `jest.fn()`. SQLite is real too (`:memory:` database per test). Vitest for the runner (fast, native TS, good fake timers).

### Recording fixtures

**WA fixtures** — `test/record.ts` connects to Baileys, captures raw message payloads, and writes them to `test/fixtures/wa-messages/`. Run it once in the real group, send a few messages of each type (text, link, poll, image, location, reaction, etc.), then Ctrl+C. Commit both the script and the resulting JSON files. You only need to re-run if WhatsApp changes its payload shapes.

**Gmail fixtures** — Construct these by hand from real API responses (copy one from the browser network tab or the Gmail API Explorer, then edit it). Gmail's response schema is stable and well-documented, so there's no need for a live recording script. Save them to `test/fixtures/gmail-responses/`.

```bash
npx tsx test/record.ts          # connect to WA, capture, ctrl+C to stop
# writes to:
#   test/fixtures/wa-messages/text.json
#   test/fixtures/wa-messages/link-preview.json
#   test/fixtures/wa-messages/poll-creation.json
#   test/fixtures/wa-messages/image.json
#   test/fixtures/wa-messages/location.json
#   test/fixtures/wa-messages/reaction.json
#   test/fixtures/wa-messages/from-me.json       # your own message (should be filtered)
#   test/fixtures/wa-messages/other-group.json   # wrong JID (should be filtered)

# hand-built:
#   test/fixtures/gmail-responses/poll-empty.json
#   test/fixtures/gmail-responses/poll-one-reply.json
#   test/fixtures/gmail-responses/poll-reply-with-quoted-history.json
#   test/fixtures/gmail-responses/send-new-thread.json
#   test/fixtures/gmail-responses/send-reply.json
```

Scrub any real names/numbers from the fixtures before committing. The script should replace them with stable fakes (`Alice`, `Bob`, `+1555000xxxx`) so fixtures double as documentation.

### Replay adapters

Two small classes (~30 lines each) that implement `WAPort` and `GmailPort` by feeding back fixture data:

**`ReplayWAPort`** — Takes an array of recorded WA message objects. Calling `replay()` fires them one by one through the registered `onMessage` handler. Exposes `sentMessages: string[]` to assert what the bridge sent back to the group.

**`ReplayGmailPort`** — Takes a map of `{ send: response[], poll: response[] }`. Each call to `send()` shifts the next response off the send queue and returns it. Each call to `poll()` shifts the next response off the poll queue. If a queue is empty, returns a sensible default (empty array for poll, a generated threadId for send). Also exposes `sentEmails: { to, subject, body, threadId? }[]` to assert outbound email content.

### What the tests cover

One test file (`test/bridge.test.ts`) with scenarios that exercise the full pipeline: fixture in → bridge core → assert output. Each test gets a fresh `:memory:` SQLite database.

**WA → Email**: plain text → correct format, 3 messages within debounce → single email, 20 messages → cap flush, first flush creates thread / second reuses it, link preview → URL only, poll creation → formatted options, location → Maps link, image → placeholder, reaction → skipped, fromMe → filtered, wrong JID → filtered.

**Email → WA**: friend reply → WA message, quoted history stripped (Gmail + Outlook styles), already-processed email → dedup skip, own sent email → skip, empty poll → checkpoint updated.

**State & recovery**: thread ID persists across restart, dedup table prevents replays after restart.

### Running

```bash
npx vitest                             # watch mode
npx vitest run                         # single run (CI)
npx vitest run --coverage              # with c8 coverage
```

## Implementation Plan

Six phases. Each ends with something you can run or test — no phase is just plumbing. See the Tasks section below for detailed work breakdown per phase.

| Phase | Goal | Done when |
|---|---|---|
| **1. Scaffold** | Config validates, DB creates tables, port interfaces defined | `npm test` passes, no external services needed |
| **2. Extract + format + debounce** | All pure logic between "raw WA message" and "formatted email line" | Every message type has a fixture and a passing test |
| **3. WA → Email** | Send a WA message, see it arrive in your friend's inbox | Bridge runs, emails land in a thread, WA→Email tests pass |
| **4. Email → WA** | Friend replies by email, reply appears in the WA group | Full bidirectional bridge, complete test suite |
| **5. Hardening** | Bridge survives crashes, disconnects, token expiry | Deploy, walk away, trust it to keep running |
| **6. Setup UX** *(optional)* | Anyone can set up the bridge from a fresh clone | Clone → README → working bridge in 10 minutes |

## Tasks

---

### Phase 1 — Scaffold

#### Task 1.1: Project init + config module

**Why**: Everything downstream depends on validated configuration. If a secret is missing or malformed, you want to know at startup — not when the first message arrives 10 minutes later.

**What**:

- `npm init`, install all production and dev dependencies in one go.
- `tsconfig.json` — strict mode, `"module": "nodenext"`, `"outDir": "dist"`. No build step needed for dev (tsx handles it), but the config should be valid for an eventual `tsc` build.
- `src/config.ts` — a zod schema that reads `process.env` via dotenv (respects `DOTENV_CONFIG_PATH` for production) and returns a typed config object. Required fields: `GMAIL_ADDRESS`, `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `FRIEND_EMAIL`, `FRIEND_NAME`, `EMAIL_SUBJECT`. Optional with defaults: `WA_GROUP_JID` (empty string = discovery mode), `POLL_INTERVAL_MS` (60000), `WA_OUTBOX_DELAY_MS` (30000), `WA_OUTBOX_MAX_MESSAGES` (20), `STORE_PATH` (`./store` — in production, set to `/var/www/badyass.xyz/wgapp-store` so state survives deploys). `parseConfig()` either returns the typed object or throws with a human-readable list of what's wrong.
- `src/ports.ts` — export `WAPort`, `GmailPort`, `WAIncomingMessage`, and `GmailMessage` types. This pins the contract before any implementation — the bridge core, adapters, and replay helpers all depend on these interfaces.
- `.env.example` with every key documented.
- `vitest.config.ts` — minimal, just `include: ['test/**/*.test.ts']`.
- A `test/config.test.ts` that asserts: missing required keys → throws with the key name; extra keys → ignored; defaults fill in; a complete env → parses to the correct types.

**Done when**: `npx vitest run` passes. `parseConfig()` with a complete `.env` returns a typed object. `ports.ts` compiles.

---

#### Task 1.2: SQLite database module

**Why**: The bridge needs durable state (thread ID, dedup set, checkpoint) that survives restarts. Getting the schema and accessors right before any business logic avoids migrating later.

**What**:

- `src/db.ts` — constructor takes a file path (or `:memory:` for tests). In production, the file path comes from `config.storePath + '/bridge.db'` (persistent across deploys). Runs `CREATE TABLE IF NOT EXISTS` for `state` (single-row, typed columns) and `processed_emails` on init. Inserts the default state row if missing. Exposes:
  - `getState(): { threadId: string | null, firstMessageId: string | null, lastPollMs: number | null }`
  - `updateState(patch: { threadId?: string, firstMessageId?: string, lastPollMs?: number }): void`
  - `isEmailProcessed(gmailMsgId): boolean`, `markEmailProcessed(gmailMsgId): void`
  - `close(): void`
- All operations are synchronous (better-sqlite3 is sync by design). Wrap in a class or a plain object with closures — whichever feels simpler.
- `test/db.test.ts` — opens `:memory:`, tests: default state row exists with nulls; update and read back threadId; partial update preserves other fields; mark an email processed then check `isEmailProcessed` returns true; check an unprocessed ID returns false; close doesn't throw.

**Done when**: DB tests pass. The module is importable with no side effects (no auto-connect on import).

---

### Phase 2 — Extract + format + debounce

#### Task 2.1: Record WA fixtures + build extraction logic

**Why**: The extraction function is the most complex pure logic in the bridge — it has to handle 15+ message types correctly. Building it against real recorded payloads (not hand-written mocks) catches field name surprises, nested structures, and edge cases that you'd otherwise only discover in production.

**What**:

- `test/record.ts` — a script that connects to Baileys, registers `messages.upsert`, and writes each incoming message's raw JSON to `test/fixtures/wa-messages/{type}.json` (auto-named by which field is present: `conversation`, `extendedTextMessage`, `pollCreationMessage`, etc.). Run it, send yourself one of each message type in the group: plain text, link, quoted reply, poll, image, video, voice note, sticker, GIF, document, location, live location, contact, reaction. Ctrl+C when done. Commit the script — you'll re-run it if Baileys changes payload shapes.
- Scrub fixtures: replace real names with `Alice`/`Bob`, phone numbers with `+1555000xxxx`. Commit them.
- `src/extract.ts` — `extractContent(msg: WAIncomingMessage): string | null`. A chain: check `msg.message.conversation` → `extendedTextMessage.text` (with optional quoted reply prefix) → `pollCreationMessage` (format question + options) → `locationMessage` (build Maps URL) → `imageMessage`/`videoMessage`/`audioMessage`/`stickerMessage`/`documentMessage` (placeholders, include caption or filename if present) → `contactMessage` (name + number) → `reactionMessage` → return `null`. Unknown types → `null`.
- `test/extract.test.ts` — load each fixture with `JSON.parse(readFileSync(...))`, pass to `extractContent()`, assert the expected output string. One test per fixture. The fixture filenames and expected outputs serve as living documentation of what the bridge handles.

**Done when**: one fixture per message type committed. All extraction tests pass. Adding a new message type later means: record one fixture, add one test, add one branch.

---

#### Task 2.2: Formatting + quote stripping

**Why**: Small functions, but they affect every message your friend sees. Getting `stripQuotedReply` wrong means the WA group sees the full email chain on every reply — extremely annoying.

**What**:

- `src/format.ts` — two exports:
  - `formatLine(sender: string, content: string): string` → `[${sender}]: ${content}`. Trim the content, collapse multiple newlines to one.
  - `stripQuotedReply(body: string): string` → strip everything after the first occurrence of: `On ... wrote:` (Gmail), `________________________________` (Outlook), a line of `>` quotes, or `From:` at the start of a line (generic). Return the trimmed remainder. If stripping leaves an empty string, return `[empty reply]` so the bridge doesn't send a blank WA message.
- Build 2–3 Gmail reply fixtures by hand per the Recording Fixtures section: one Gmail-style, one Outlook-style, one clean reply with no history.
- `test/format.test.ts` — test `formatLine` (basic formatting, multiline content, whitespace trimming) and `stripQuotedReply` (each reply style, nested quotes, empty-after-strip edge case).

**Done when**: format tests pass. You're confident that email replies will arrive in WA clean.

---

#### Task 2.3: Debounce buffer

**Why**: Without debouncing, a 10-message burst in the group sends 10 separate emails. The buffer is the difference between a usable product and inbox spam.

**What**:

- `src/debounce.ts` — `DebounceBuffer` class:
  - Constructor: `(delayMs: number, maxBatch: number, onFlush: (lines: string[]) => void | Promise<void>)`
  - `push(line: string)`: add to internal array, reset the inactivity timer. If array length hits `maxBatch`, flush immediately.
  - `forceFlush()`: flush now regardless of timer (used during graceful shutdown).
  - `destroy()`: cancel any pending timer without flushing (used if you need to abort).
  - Internal: `setTimeout`/`clearTimeout` for the inactivity window.
- `test/debounce.test.ts` — use `vi.useFakeTimers()`:
  - Push 2 lines, advance 30s → flushes with both lines.
  - Push 1 line, advance 15s, push another, advance 30s → flushes with both (timer reset).
  - Push 20 lines without advancing → flushes at cap immediately.
  - Push 1 line, call `forceFlush()` → flushes immediately.
  - Push 1 line, call `destroy()`, advance 30s → no flush.
  - Flush callback is async → awaited before buffer resets.

**Done when**: debounce tests pass with fake timers. No real timers, no flakiness.

---

### Phase 3 — WA → Email

#### Task 3.1: Gmail send adapter

**Why**: You need to send RFC 2822 emails through the Gmail API, with correct threading headers. Getting the raw message encoding and header format right is fiddly — better to nail it in isolation before wiring it into the bridge.

**What**:

- `src/adapters/gmail-api.ts` — `GmailAPIAdapter` implements `GmailPort`:
  - Constructor: takes `clientId`, `clientSecret`, `refreshToken`, `userEmail`. Creates a `google.auth.OAuth2` client, sets credentials.
  - `send({ to, subject, body, threadId?, inReplyTo? })`: builds a raw RFC 2822 message string (`From`, `To`, `Subject`, `In-Reply-To`, `References`, `Content-Type: text/plain; charset=utf-8`, blank line, body). Base64url-encodes it. Calls `gmail.users.messages.send({ userId: 'me', requestBody: { raw, threadId } })`. Returns `{ threadId, messageId }` extracted from the response.
  - `poll()`: stub returning `[]` for now (built in phase 4).
- Build `send-new-thread.json` and `send-reply.json` fixtures by hand — copy a real `messages.send` response from the Gmail API Explorer, edit the IDs.
- `ReplayGmailPort` and `ReplayWAPort` (`test/helpers/`): build both replay adapters as described in the Testing section's Replay Adapters subsection.

**Done when**: `ReplayGmailPort` works. Optionally, a manual test that calls `GmailAPIAdapter.send()` directly and verifies the email arrives — but this isn't automated (requires real credentials).

---

#### Task 3.2: Baileys adapter + bridge wiring (WA → Email direction)

**Why**: This is the first time the whole WA→Email pipeline runs end-to-end. The individual pieces are tested; this task connects them.

**What**:

- `src/adapters/baileys.ts` — `BaileysWAAdapter` implements `WAPort`:
  - Constructor: takes auth store path and optional group JID. Creates Baileys socket with `useMultiFileAuthState(storePath)`. Handles `connection.update` (log status, display QR via `qrcode-terminal`). On `messages.upsert`, filters to `remoteJid === groupJid && !fromMe`, then fires the registered handler.
  - `sendMessage()`: stub (logs to console for now).
  - If `groupJid` is empty, log every incoming message's JID + push name for discovery.
- `src/bridge.ts` — the orchestrator:
  - Constructor: `(wa: WAPort, gmail: GmailPort, db: DB, config: Config)`
  - `start()`: registers `wa.onMessage` handler → calls `extractContent()` → if null, return → `formatLine(pushName, content)` → `debounceBuffer.push(line)`.
  - Debounce flush callback: calls `db.getState()` → if no `threadId`, call `gmail.send()` without threadId, store returned values via `db.updateState({ threadId, firstMessageId })` → if `threadId` exists, call `gmail.send()` with threadId + inReplyTo.
- `src/index.ts` — `parseConfig()` → `new DB(storePath)` → `new BaileysWAAdapter(...)` → `new GmailAPIAdapter(...)` → `new Bridge(wa, gmail, db, config).start()`.
- `test/bridge.test.ts` — add WA→Email scenarios (see Testing section for the full list). Key cases: text message formatting, debounce batching (3 messages → 1 email), cap flush (20 messages), thread creation vs reuse, each message type fixture, and `fromMe`/wrong-JID filtering.

**Done when**: `npx tsx src/index.ts` connects to WA, messages appear in email. Integration tests pass.

---

### Phase 4 — Email → WA

#### Task 4.1: Gmail poll adapter

**Why**: Polling is the trickiest Gmail integration — you need to query by thread, filter by sender, handle pagination, and extract clean plain-text bodies from MIME messages. Getting this right in isolation (before wiring into the bridge) avoids debugging through layers.

**What**:

- Finish `GmailAPIAdapter.poll(threadId, afterMs)`:
  - Call `gmail.users.messages.list(...)` with `threadId` as a parameter and `q: "after:YYYY/MM/DD"` (convert `afterMs` to a date string — Gmail's `after:` operator uses `YYYY/MM/DD`, not epoch seconds). Paginate with `maxResults: 50` to avoid ballooning as the thread grows. Note: `after:` has day-level granularity, so within the same day you'll re-fetch messages already processed — this is fine, the `processed_emails` dedup table is the real filter. The `after:` query just avoids fetching the entire thread history.
  - For each result, call `gmail.users.messages.get(...)` with `format: 'full'`.
  - Extract `From` header from `payload.headers`.
  - Extract plain-text body: find the `text/plain` MIME part in `payload.parts` (or `payload.body` if not multipart), base64url-decode it.
  - Return `GmailMessage[]` with `{ id, from, body }`.
- Build poll fixtures by hand: construct `poll-empty.json`, `poll-one-reply.json`, `poll-reply-with-quoted-history.json`, and `poll-own-message.json` from the Gmail API response schema. Copy a real `messages.get` response once for reference, then edit sender, body, and IDs.
- Add poll fixtures to `ReplayGmailPort` — the poll queue returns them in sequence.

**Done when**: `ReplayGmailPort` can serve canned poll responses. Optionally, a manual test that calls `GmailAPIAdapter.poll()` against a real thread and prints the results.

---

#### Task 4.2: Email → WA bridge wiring + full test suite

**Why**: Completes the bridge. After this task, both directions work and the full test suite validates the system end-to-end against recorded fixtures.

**What**:

- Finish `BaileysWAAdapter.sendMessage(jid, { text })` — calls `sock.sendMessage(jid, { text })`.
- Add poll loop to `bridge.ts`:
  - `startPolling()`: `setInterval` at `config.pollIntervalMs`.
  - Each tick: call `db.getState()` — if no `threadId`, skip (no thread yet). Call `gmail.poll(threadId, lastPollMs ?? 0)` (default to `0` on first poll, which fetches all messages in the thread). For each returned message: skip if `from !== config.friendEmail`, skip if `db.isEmailProcessed(id)`, run `stripQuotedReply(body)`, format as `[${config.friendName} via email]: ${stripped}`, call `wa.sendMessage(groupJid, { text: formatted })`, call `db.markEmailProcessed(id)`. Call `db.updateState({ lastPollMs: Date.now() })`.
- Add Email→WA tests to `bridge.test.ts` (see the test pseudocode in the Testing section for the full list). Key cases: friend reply → WA message, quote stripping (Gmail + Outlook styles), dedup, own-email filtering, empty poll checkpoint update.
- Add state recovery tests: thread ID persists across bridge restarts, dedup table prevents replaying old emails after restart.

**Done when**: `npx vitest run` passes the complete test suite. The bridge runs bidirectionally in manual testing. This is the "it works" milestone.

---

### Phase 5 — Hardening

#### Task 5.1: Reconnect, error handling, graceful shutdown

**Why**: Baileys drops WebSocket connections regularly (WhatsApp's servers reset them, your network hiccups, etc.). Gmail tokens can expire if the refresh fails. Without handling these, the bridge silently stops working and nobody notices.

**What**:

- **Baileys reconnect**: in `BaileysWAAdapter`, handle `connection.update` events:
  - `connection === 'close'`: check `lastDisconnect.error.output.statusCode`. On 401 (logged out) → log a clear "re-scan QR required" message and `process.exit(1)` (PM2 will restart, but QR scan is needed). On 408/515/other → reconnect with exponential backoff (1s, 2s, 4s, 8s, max 60s). Reset backoff on successful reconnect.
  - `connection === 'open'` → log "connected", reset backoff counter.
- **Gmail error handling**: wrap `send()` and `poll()` in try/catch. On 401/403 → log "OAuth token issue, check refresh token". On 429 → log "rate limited", skip this cycle (poll will retry next interval). On network errors → log and continue (polling is inherently retry-friendly).
- **Graceful shutdown**: register `process.on('SIGTERM')` and `process.on('SIGINT')`. On signal: call `debounceBuffer.forceFlush()` (send any pending messages), stop the poll interval, close the Baileys socket, close the DB, then `process.exit(0)`.
- **Debounce flush error handling**: if the flush callback (gmail.send) throws, log the error and the lines that were lost. Don't retry automatically — the next batch will go through, and retrying stale messages could cause confusing ordering.

**Done when**: kill the process with `SIGTERM` → pending messages flush, clean exit. Disconnect network → bridge reconnects automatically. Pull the WhatsApp session (unlink device) → bridge logs "re-scan QR" and exits.

---

#### Task 5.2: Logging + deployment scripts

**Why**: `console.log` gets you through development, but in production you need structured timestamps, log levels, and a way to trace what happened when something goes wrong at 3 AM.

**What**:

- `src/logger.ts` — a thin wrapper (not a library): `log(level: 'info' | 'warn' | 'error', msg: string, data?: Record<string, unknown>)`. Outputs JSON lines: `{"ts":"...","level":"info","msg":"email sent","threadId":"...","lines":3}`. Parseable by any log aggregator and greppable by humans.
- Replace all `console.log` calls with the logger. Log every significant event: messages received/sent/filtered, connection state changes, poll cycles, errors with stack traces.
- Create `deploy.sh` and `cleanup_deploys.sh` following the blue-green pattern (see Deployment section above).
- Create `.github/workflows/deploy-wgapp.yml` for CI/CD (see Deployment section).
- Finalize `ecosystem.config.cjs` with `log_date_format: 'YYYY-MM-DD HH:mm:ss'`, `error_file` and `out_file` paths under `wgapp-store/logs/`.
- Manual verification: deploy via `npm run deploy`, verify PM2 restarts. `kill -9 $(pm2 pid wgapp)` → verify PM2 restarts it. Push a change → verify GitHub Actions deploys it.

**Done when**: `pm2 logs wgapp` shows structured JSON logs with timestamps. Bridge survives `kill -9` and redeploys. CI/CD pipeline works.

---

### Phase 6 — Setup UX *(optional — nice for future you, not needed for personal use)*

#### Task 6.1: Gmail OAuth setup script

**Why**: Getting OAuth credentials is the most confusing part of setup. A guided script turns a 15-minute Google Cloud Console maze into a 2-minute interactive flow.

**What**:

- `src/auth-setup.ts` — runnable via `npx tsx src/auth-setup.ts`:
  - Prompts for `client_id` and `client_secret` (or reads from `.env` if already set).
  - Creates an OAuth2 client, generates the auth URL with scopes `https://www.googleapis.com/auth/gmail.send` + `https://www.googleapis.com/auth/gmail.readonly`.
  - Starts a tiny HTTP server on `localhost:3000` as the redirect URI.
  - Opens the auth URL in the default browser (`open` / `xdg-open`).
  - On callback, exchanges the code for tokens, prints the `refresh_token`.
  - Asks "Write to .env? (y/n)" — if yes, appends/replaces the `GMAIL_REFRESH_TOKEN` line in `.env`.
  - Exits cleanly.
- Handle errors: invalid client ID (clear message), user denies access (clear message), port 3000 in use (try 3001).

**Done when**: run the script from a fresh `.env` with just client_id/secret filled in → browser opens → authorize → refresh token written to `.env` automatically.

---

#### Task 6.2: Group discovery script + first-run mode + README

**Why**: Finding the WhatsApp group JID is the second friction point. And without a README, future-you will stare at the `.env.example` for 10 minutes trying to remember the order of operations.

**What**:

- `src/list-groups.ts` — runnable via `npx tsx src/list-groups.ts`:
  - Connects Baileys (same auth store as the bridge). If no session, shows QR.
  - Calls `sock.groupFetchAllParticipating()` to list groups.
  - Prints a numbered list: `1. Family Group (12345-67890@g.us) — 8 members`.
  - Prompts "Pick a group (number):" → writes `WA_GROUP_JID` to `.env`.
  - Disconnects cleanly.
- **First-run mode** in `src/index.ts`: if `WA_GROUP_JID` is empty after config parse, log `"No WA_GROUP_JID set. Run: npx tsx src/list-groups.ts"` and exit with code 0 (not an error, just not configured yet).
- `README.md`:
  - Prerequisites (Node 20, a Gmail account with a Google Cloud project, a WhatsApp account).
  - Step 1: `npm install`.
  - Step 2: Copy `.env.example` to `.env`, fill in `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET` from Google Cloud Console (link to the specific page).
  - Step 3: `npx tsx src/auth-setup.ts` — follow the browser flow.
  - Step 4: `npx tsx src/list-groups.ts` — scan QR if needed, pick the group.
  - Step 5: Fill in `FRIEND_EMAIL`, `FRIEND_NAME`, `EMAIL_SUBJECT`.
  - Step 6: `npx tsx src/index.ts` — verify it works.
  - Step 7: `pm2 start ecosystem.config.cjs && pm2 save && pm2 startup`.
  - Troubleshooting: common errors (invalid refresh token, QR expired, group JID not found).

**Done when**: someone clones the repo, follows the README, and has a working bridge without reading any other documentation.

---

### Task overview

| # | Task | Phase | Key output |
|---|---|---|---|
| 1.1 | Project init + config + port interfaces | Scaffold | `parseConfig()`, `ports.ts`, `.env.example`, config tests |
| 1.2 | SQLite database module | Scaffold | `db.ts`, state + dedup operations, DB tests |
| 2.1 | Record fixtures + extraction logic | Pure logic | Fixtures committed, `extractContent()`, extraction tests |
| 2.2 | Formatting + quote stripping | Pure logic | `formatLine()`, `stripQuotedReply()`, format tests |
| 2.3 | Debounce buffer | Pure logic | `DebounceBuffer` class, fake-timer tests |
| 3.1 | Gmail send adapter + replay helpers | WA → Email | `GmailAPIAdapter.send()`, `ReplayGmailPort`, `ReplayWAPort` |
| 3.2 | Baileys adapter + bridge wiring | WA → Email | `BaileysWAAdapter`, `bridge.ts`, WA→Email tests |
| 4.1 | Gmail poll adapter | Email → WA | `GmailAPIAdapter.poll()`, poll fixtures |
| 4.2 | Email → WA wiring + full test suite | Email → WA | Complete bridge, complete test suite |
| 5.1 | Reconnect + error handling + shutdown | Hardening | Backoff logic, graceful flush, signal handlers |
| 5.2 | Logging + deployment scripts | Hardening | Structured logger, deploy.sh, CI/CD workflow, PM2 config |
| 6.1 | Gmail OAuth setup script | Setup UX | Interactive `auth-setup.ts` |
| 6.2 | Group discovery + README | Setup UX | `list-groups.ts`, first-run mode, `README.md` |

## Future Improvements (when needed, not before)

- **Image/document forwarding**: Baileys can download media buffers; attach them to the email. Reverse: parse email attachments, upload via Baileys `sendMessage` with `image`/`document` type. This is the obvious v2 feature — the placeholder messages already tell the friend something was sent, so they know what they're missing.
- **Thread rotation or pagination**: After months of use, the single email thread could have thousands of messages. Gmail's `messages.list` will return increasingly large result sets. At some point, consider either starting a new thread periodically (e.g. monthly) or switching to Gmail's `history.list` API with `historyId` for incremental sync instead of `after:` date queries.
- **Poll vote tracking**: Technically possible by decrypting `pollUpdateMessage` payloads and maintaining a tally, then sending periodic summary emails. Complex and probably not worth it.
- **Health endpoint**: Tiny HTTP server on localhost exposing `/health` for UptimeRobot or similar.
- **Graceful reconnect logging**: Send a `[Bridge reconnected — replayed N messages]` notice to the group after downtime, so people know what happened.
