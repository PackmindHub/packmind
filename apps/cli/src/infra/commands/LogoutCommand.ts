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

function getCredentialsPath(): string {
  return path.join(os.homedir(), CREDENTIALS_DIR, CREDENTIALS_FILE);
}

export const logoutCommand = command({
  name: 'logout',
  description: 'Clear stored credentials and log out',
  args: {},
  handler: async () => {
    const credentialsPath = getCredentialsPath();

    // Check if using environment variable
    if (process.env.PACKMIND_API_KEY_V3) {
      logInfoConsole(
        'Authentication is configured via PACKMIND_API_KEY_V3 environment variable.',
      );
      console.log(
        'To log out, unset the environment variable: unset PACKMIND_API_KEY_V3',
      );
    }

    // Check if credentials file exists
    if (!fs.existsSync(credentialsPath)) {
      if (!process.env.PACKMIND_API_KEY_V3) {
        logInfoConsole('No stored credentials found. Already logged out.');
      }
      return;
    }

    // Remove credentials file
    try {
      fs.unlinkSync(credentialsPath);
      logSuccessConsole('Logged out successfully.');
      console.log(`\nRemoved credentials from: ${credentialsPath}`);
    } catch (error) {
      logErrorConsole('Failed to remove credentials file.');
      console.log(
        `Error: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exit(1);
    }
  },
});
