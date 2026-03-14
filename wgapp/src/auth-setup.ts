import { google } from 'googleapis';
import http from 'http';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const clientId = process.env.GMAIL_CLIENT_ID;
const clientSecret = process.env.GMAIL_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error('Missing GMAIL_CLIENT_ID or GMAIL_CLIENT_SECRET in .env');
  process.exit(1);
}

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
];

const PORT = 3000;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;

const oauth2 = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

const authUrl = oauth2.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: SCOPES,
});

const server = http.createServer(async (req, res) => {
  if (!req.url?.startsWith('/callback')) {
    res.writeHead(404);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`Authorization denied: ${error}\nYou can close this tab.`);
    server.close();
    process.exit(1);
  }

  if (!code) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Missing authorization code.');
    return;
  }

  try {
    const { tokens } = await oauth2.getToken(code);
    const refreshToken = tokens.refresh_token;

    if (!refreshToken) {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('No refresh token received. Try revoking access at https://myaccount.google.com/permissions and running this script again.');
      server.close();
      process.exit(1);
    }

    console.log(`\nRefresh token: ${refreshToken}\n`);

    // Write to .env
    const envPath = '.env';
    if (existsSync(envPath)) {
      let envContent = readFileSync(envPath, 'utf-8');
      if (envContent.match(/^GMAIL_REFRESH_TOKEN=.*/m)) {
        envContent = envContent.replace(
          /^GMAIL_REFRESH_TOKEN=.*/m,
          `GMAIL_REFRESH_TOKEN=${refreshToken}`,
        );
      } else {
        envContent += `\nGMAIL_REFRESH_TOKEN=${refreshToken}\n`;
      }
      writeFileSync(envPath, envContent);
      console.log('Written to .env');
    }

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h2>Done! Refresh token saved to .env.</h2><p>You can close this tab.</p>');
  } catch (err) {
    console.error('Token exchange failed:', err);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end(`Token exchange failed: ${err}`);
  }

  server.close();
});

server.listen(PORT, () => {
  console.log(`Opening browser for Gmail authorization...\n`);
  console.log(`If it doesn't open, visit:\n${authUrl}\n`);

  // Open browser (macOS)
  try {
    execSync(`open "${authUrl}"`);
  } catch {
    // Fallback: user copies the URL manually
  }
});
