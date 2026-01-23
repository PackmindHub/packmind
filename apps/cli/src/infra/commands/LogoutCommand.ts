import { command } from 'cmd-ts';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import {
  logSuccessConsole,
  logErrorConsole,
  logInfoConsole,
  logConsole,
} from '../utils/consoleLogger';

export const logoutCommand = command({
  name: 'logout',
  description: 'Clear stored credentials and log out',
  args: {},
  handler: async () => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    try {
      const result = await packmindCliHexa.logout({});

      if (!result.hadCredentialsFile && !result.hasEnvVar) {
        logInfoConsole('No stored credentials found. Already logged out.');
        return;
      }

      if (result.hadCredentialsFile) {
        logSuccessConsole('Logged out successfully.');
        logConsole(`Removed credentials from: ${result.credentialsPath}`);
      }

      if (result.hasEnvVar) {
        if (!result.hadCredentialsFile) {
          logInfoConsole('No stored credentials file found.');
        }
        logConsole(
          '\nNote: PACKMIND_API_KEY_V3 environment variable is still set.',
        );
        logConsole('To fully log out, run: unset PACKMIND_API_KEY_V3');
      }
    } catch (error) {
      logErrorConsole('Failed to remove credentials file.');
      logConsole(
        `Error: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exit(1);
    }
  },
});
