import { command, option, string, optional } from 'cmd-ts';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import {
  logSuccessConsole,
  logErrorConsole,
  logInfoConsole,
} from '../utils/consoleLogger';

const DEFAULT_HOST = 'https://app.packmind.ai';

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
  handler: async ({ host, code }) => {
    if (!host.includes('://')) {
      logErrorConsole(
        'Invalid host URL: protocol is required (e.g., https://your-host.com)',
      );
      process.exit(1);
    }

    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    try {
      if (!code) {
        console.log('\nOpening browser for authentication...');
        console.log(
          `\nIf the browser doesn't open, visit: ${host}/cli-login?callback_url=${encodeURIComponent('http://127.0.0.1:19284')}\n`,
        );
        logInfoConsole('Waiting for browser authentication...');
      }

      logInfoConsole('Exchanging code for API key...');

      const result = await packmindCliHexa.login({ host, code });

      logSuccessConsole('Login successful!');
      console.log(`\nCredentials saved to: ${result.credentialsPath}`);
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
