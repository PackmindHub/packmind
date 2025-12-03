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
    const hasEnvVar = !!process.env.PACKMIND_API_KEY_V3;
    const hasCredentialsFile = fs.existsSync(credentialsPath);

    // No credentials at all
    if (!hasCredentialsFile && !hasEnvVar) {
      logInfoConsole('No stored credentials found. Already logged out.');
      return;
    }

    // Remove credentials file if it exists
    if (hasCredentialsFile) {
      try {
        fs.unlinkSync(credentialsPath);
        logSuccessConsole('Logged out successfully.');
        console.log(`Removed credentials from: ${credentialsPath}`);
      } catch (error) {
        logErrorConsole('Failed to remove credentials file.');
        console.log(
          `Error: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exit(1);
      }
    }

    // Note about environment variable if set
    if (hasEnvVar) {
      if (!hasCredentialsFile) {
        logInfoConsole('No stored credentials file found.');
      }
      console.log(
        '\nNote: PACKMIND_API_KEY_V3 environment variable is still set.',
      );
      console.log('To fully log out, run: unset PACKMIND_API_KEY_V3');
    }
  },
});
