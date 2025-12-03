import { command, option, string, optional } from 'cmd-ts';
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

const DEFAULT_HOST = 'https://app.packmind.ai';
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
function startCallbackServer(): Promise<string> {
  return new Promise((resolve, reject) => {
    let timeoutId: NodeJS.Timeout | null = null;

    const server = http.createServer((req, res) => {
      // Set CORS headers to allow browser redirect
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');

      const url = new URL(req.url || '/', `http://localhost:${CALLBACK_PORT}`);
      const code = url.searchParams.get('code');

      if (code) {
        // Send simple JSON success response - the webapp will show the success UI
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));

        // Clean up timeout
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        // Resolve immediately so CLI can proceed without waiting for server close
        resolve(code);

        // Close server in background - don't block on this
        setImmediate(() => {
          server.close();
        });
      } else {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Missing code parameter');
      }
    });

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
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
    timeoutId = setTimeout(() => {
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
    code: option({
      type: optional(string),
      long: 'code',
      description:
        'Login code from the web interface (skips browser authentication)',
    }),
  },
  handler: async ({ host, code: providedCode }) => {
    try {
      let code: string;

      if (providedCode) {
        // Code provided via --code flag, skip browser flow
        code = providedCode;
      } else {
        // Start the callback server for browser flow
        const callbackPromise = startCallbackServer();

        const callbackUrl = `http://127.0.0.1:${CALLBACK_PORT}`;
        const loginUrl = `${host}/cli-login?callback_url=${encodeURIComponent(callbackUrl)}`;

        console.log('\nOpening browser for authentication...');
        console.log(`\nIf the browser doesn't open, visit: ${loginUrl}\n`);

        openBrowser(loginUrl);

        logInfoConsole('Waiting for browser authentication...');
        try {
          code = await callbackPromise;
        } catch {
          // Fallback to manual code entry if callback server fails
          code = await promptForCode();
        }
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
    }
  },
});
