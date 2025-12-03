import { command } from 'cmd-ts';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  logSuccessConsole,
  logErrorConsole,
  logInfoConsole,
} from '../utils/consoleLogger';

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

function loadCredentials(): Credentials | null {
  const credentialsPath = getCredentialsPath();

  if (!fs.existsSync(credentialsPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(credentialsPath, 'utf-8');
    return JSON.parse(content) as Credentials;
  } catch {
    return null;
  }
}

function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) {
    return '********';
  }
  return `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`;
}

function formatExpiresAt(expiresAt: string): string {
  const date = new Date(expiresAt);
  const now = new Date();

  if (date < now) {
    return 'Expired';
  }

  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(
    (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
  );

  if (diffDays > 0) {
    return `Expires in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
  }
  if (diffHours > 0) {
    return `Expires in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
  }
  return 'Expires soon';
}

export const whoamiCommand = command({
  name: 'whoami',
  description: 'Show current authentication status and credentials info',
  args: {},
  handler: async () => {
    // Check environment variable first
    const envApiKey = process.env.PACKMIND_API_KEY_V3;
    if (envApiKey) {
      logSuccessConsole('Authenticated via environment variable');
      console.log(`\nAPI Key: ${maskApiKey(envApiKey)}`);
      console.log('Source: PACKMIND_API_KEY_V3 environment variable');
      return;
    }

    // Check credentials file
    const credentials = loadCredentials();

    if (!credentials) {
      logErrorConsole('Not authenticated');
      console.log(
        '\nNo credentials found. Run `packmind-cli login` to authenticate.',
      );
      process.exit(1);
    }

    // Check if expired
    const expiresAt = new Date(credentials.expiresAt);
    const isExpired = expiresAt < new Date();

    if (isExpired) {
      logErrorConsole('Credentials expired');
      console.log(`\nAPI Key: ${maskApiKey(credentials.apiKey)}`);
      console.log(`Host: ${credentials.host}`);
      console.log(`Expired: ${expiresAt.toLocaleDateString()}`);
      console.log('\nRun `packmind-cli login` to re-authenticate.');
      process.exit(1);
    }

    logSuccessConsole('Authenticated');
    console.log(`\nAPI Key: ${maskApiKey(credentials.apiKey)}`);
    console.log(`Host: ${credentials.host}`);
    console.log(`${formatExpiresAt(credentials.expiresAt)}`);
    logInfoConsole(`Credentials file: ${getCredentialsPath()}`);
  },
});
