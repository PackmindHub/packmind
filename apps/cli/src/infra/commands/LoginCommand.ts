import { command, option, string } from 'cmd-ts';
import * as http from 'http';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import {
  logSuccessConsole,
  logErrorConsole,
  logInfoConsole,
} from '../utils/consoleLogger';

const DEFAULT_HOST = 'https://app.packmind.com';
const CREDENTIALS_DIR = '.packmind';
const CREDENTIALS_FILE = 'credentials.json';
const CALLBACK_PORT = 19284;
const CALLBACK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

interface Credentials {
  apiKey: string;
  host: string;
  expiresAt: string;
}

function getCredentialsPath(): string {
  return path.join(os.homedir(), CREDENTIALS_DIR, CREDENTIALS_FILE);
}

function saveCredentials(credentials: Credentials): void {
  const credentialsDir = path.join(os.homedir(), CREDENTIALS_DIR);

  if (!fs.existsSync(credentialsDir)) {
    fs.mkdirSync(credentialsDir, { recursive: true, mode: 0o700 });
  }

  const credentialsPath = getCredentialsPath();
  fs.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2), {
    mode: 0o600,
  });
}

async function exchangeCodeForApiKey(
  code: string,
  host: string,
): Promise<{ apiKey: string; expiresAt: string }> {
  const url = `${host}/api/v0/auth/cli-login-exchange`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Invalid or unknown code. Please try again.');
    }
    if (response.status === 410) {
      throw new Error('Code has expired. Please generate a new one.');
    }

    let errorMsg = `Failed to exchange code: ${response.status} ${response.statusText}`;
    try {
      const errorBody = await response.json();
      if (errorBody && errorBody.message) {
        errorMsg = errorBody.message;
      }
    } catch {
      // ignore if body is not json
    }
    throw new Error(errorMsg);
  }

  const result = (await response.json()) as {
    apiKey: string;
    expiresAt: string;
  };
  return result;
}

async function promptForCode(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('Enter the login code from the browser: ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function openBrowser(url: string): void {
  const platform = process.platform;

  let openCommand: string;
  if (platform === 'darwin') {
    openCommand = `open "${url}"`;
  } else if (platform === 'win32') {
    openCommand = `start "" "${url}"`;
  } else {
    openCommand = `xdg-open "${url}"`;
  }

  exec(openCommand, (error: Error | null) => {
    if (error) {
      console.log(`\nCould not open browser automatically.`);
      console.log(`Please open this URL manually: ${url}\n`);
    }
  });
}

/**
 * Start a local HTTP server to receive the callback from the browser.
 * Returns a promise that resolves with the code when received.
 */
function startCallbackServer(): Promise<{ code: string; server: http.Server }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      // Set CORS headers to allow browser redirect
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');

      const url = new URL(req.url || '/', `http://localhost:${CALLBACK_PORT}`);
      const code = url.searchParams.get('code');

      if (code) {
        // Send success response to browser
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Packmind CLI Login</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: #f5f5f5;
              }
              .container {
                text-align: center;
                padding: 40px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
              h1 { color: #22c55e; margin-bottom: 16px; }
              p { color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Login Successful!</h1>
              <p>You can close this window and return to your terminal.</p>
            </div>
          </body>
          </html>
        `);

        resolve({ code, server });
      } else {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Missing code parameter');
      }
    });

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        reject(new Error(`Port ${CALLBACK_PORT} is already in use`));
      } else {
        reject(err);
      }
    });

    server.listen(CALLBACK_PORT, '127.0.0.1', () => {
      // Server started successfully
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error('Login timed out. Please try again.'));
    }, CALLBACK_TIMEOUT_MS);
  });
}

export const loginCommand = command({
  name: 'login',
  description: 'Authenticate with Packmind by logging in through the browser',
  args: {
    host: option({
      type: string,
      long: 'host',
      description: 'Packmind server URL (default: https://app.packmind.com)',
      defaultValue: () => DEFAULT_HOST,
    }),
  },
  handler: async ({ host }) => {
    let server: http.Server | null = null;

    try {
      // Try to start the callback server
      let useCallback = true;
      let callbackPromise: Promise<{
        code: string;
        server: http.Server;
      }> | null = null;

      try {
        callbackPromise = startCallbackServer();
      } catch {
        useCallback = false;
      }

      const callbackUrl = `http://127.0.0.1:${CALLBACK_PORT}`;
      const loginUrl = useCallback
        ? `${host}/cli-login?callback_url=${encodeURIComponent(callbackUrl)}`
        : `${host}/cli-login`;

      console.log('\nOpening browser for authentication...');
      console.log(`\nIf the browser doesn't open, visit: ${loginUrl}\n`);

      openBrowser(loginUrl);

      let code: string;

      if (useCallback && callbackPromise) {
        logInfoConsole('Waiting for browser authentication...');
        try {
          const result = await callbackPromise;
          code = result.code;
          server = result.server;
        } catch {
          // Fallback to manual code entry
          useCallback = false;
          code = await promptForCode();
        }
      } else {
        code = await promptForCode();
      }

      if (!code) {
        logErrorConsole('No code received. Login cancelled.');
        process.exit(1);
      }

      logInfoConsole('Exchanging code for API key...');

      const result = await exchangeCodeForApiKey(code, host);

      const credentials: Credentials = {
        apiKey: result.apiKey,
        host,
        expiresAt: result.expiresAt,
      };

      saveCredentials(credentials);

      logSuccessConsole('Login successful!');
      console.log(`\nCredentials saved to: ${getCredentialsPath()}`);
      console.log(
        '\nYou can now use packmind-cli commands with your authenticated account.',
      );
    } catch (error) {
      if (error instanceof Error) {
        logErrorConsole(error.message);
      } else {
        logErrorConsole(String(error));
      }
      process.exit(1);
    } finally {
      // Clean up server
      if (server) {
        server.close();
      }
    }
  },
});
