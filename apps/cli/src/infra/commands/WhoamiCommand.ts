import { command } from 'cmd-ts';
import {
  logSuccessConsole,
  logErrorConsole,
  logInfoConsole,
} from '../utils/consoleLogger';
import {
  loadCredentials,
  CredentialsResult,
  getCredentialsPath,
} from '../utils/credentials';

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

function displayAuthInfo(credentials: CredentialsResult): void {
  console.log(`\nHost: ${credentials.host}`);
  if (credentials.organizationName) {
    console.log(`Organization: ${credentials.organizationName}`);
  }
  if (credentials.userName) {
    console.log(`User: ${credentials.userName}`);
  }
  if (credentials.expiresAt) {
    console.log(formatExpiresAt(credentials.expiresAt));
  }
  logInfoConsole(`Source: ${credentials.source}`);

  if (credentials.isExpired) {
    console.log('\nRun `packmind-cli login` to re-authenticate.');
  }
}

export const whoamiCommand = command({
  name: 'whoami',
  description: 'Show current authentication status and credentials info',
  args: {},
  handler: async () => {
    const credentials = loadCredentials();

    if (!credentials) {
      logErrorConsole('Not authenticated');
      console.log(
        `\nNo credentials found. Run \`packmind-cli login\` to authenticate.`,
      );
      console.log(`\nCredentials are loaded from (in order of priority):`);
      console.log(`  1. PACKMIND_API_KEY_V3 environment variable`);
      console.log(`  2. ${getCredentialsPath()}`);
      process.exit(1);
    }

    if (credentials.isExpired) {
      logErrorConsole('Credentials expired');
    } else {
      logSuccessConsole('Authenticated');
    }

    displayAuthInfo(credentials);

    if (credentials.isExpired) {
      process.exit(1);
    }
  },
});
