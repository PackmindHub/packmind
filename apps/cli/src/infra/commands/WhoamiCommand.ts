import { command } from 'cmd-ts';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import {
  logSuccessConsole,
  logErrorConsole,
  logInfoConsole,
  logConsole,
} from '../utils/consoleLogger';
import { IWhoamiResult } from '../../domain/useCases/IWhoamiUseCase';

function formatExpiresAt(expiresAt: Date): string {
  const now = new Date();

  if (expiresAt < now) {
    return `Expired: ${expiresAt.toLocaleDateString()}`;
  }

  const diffMs = expiresAt.getTime() - now.getTime();
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

function displayAuthInfo(
  result: IWhoamiResult & { isAuthenticated: true },
): void {
  logConsole(`\nHost: ${result.host}`);
  if (result.organizationName) {
    logConsole(`Organization: ${result.organizationName}`);
  }
  if (result.userName) {
    logConsole(`User: ${result.userName}`);
  }
  if (result.expiresAt) {
    logConsole(formatExpiresAt(result.expiresAt));
  }
  logInfoConsole(`Source: ${result.source}`);

  if (result.isExpired) {
    logConsole('\nRun `packmind-cli login` to re-authenticate.');
  }
}

export const whoamiCommand = command({
  name: 'whoami',
  description: 'Show current authentication status and credentials info',
  args: {},
  handler: async () => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    const result = await packmindCliHexa.whoami({});

    if (!result.isAuthenticated) {
      logErrorConsole('Not authenticated');
      logConsole(
        `\nNo credentials found. Run \`packmind-cli login\` to authenticate.`,
      );
      logConsole(`\nCredentials are loaded from (in order of priority):`);
      logConsole(`  1. PACKMIND_API_KEY_V3 environment variable`);
      logConsole(`  2. ${result.credentialsPath}`);
      process.exit(1);
    }

    if (result.isExpired) {
      logErrorConsole('Credentials expired');
    } else {
      logSuccessConsole('Authenticated');
    }

    displayAuthInfo(result);

    if (result.isExpired) {
      process.exit(1);
    }
  },
});
