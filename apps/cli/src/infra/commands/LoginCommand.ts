import { command, option, string } from 'cmd-ts';
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

export const loginCommand = command({
  name: 'login',
  description:
    'Authenticate with Packmind by logging in through the browser and entering the code',
  args: {
    host: option({
      type: string,
      long: 'host',
      description: 'Packmind server URL (default: https://app.packmind.com)',
      defaultValue: () => DEFAULT_HOST,
    }),
  },
  handler: async ({ host }) => {
    try {
      const loginUrl = `${host}/cli-login`;

      console.log('\nOpening browser for authentication...');
      console.log(`\nIf the browser doesn't open, visit: ${loginUrl}\n`);

      openBrowser(loginUrl);

      const code = await promptForCode();

      if (!code) {
        logErrorConsole('No code entered. Login cancelled.');
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
