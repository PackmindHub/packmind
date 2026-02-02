import { PackmindCliHexa } from '../../PackmindCliHexa';
import {
  formatSlug,
  formatLabel,
  formatLink,
  formatHeader,
} from '../utils/consoleLogger';
import { loadApiKey, decodeApiKey } from '../utils/credentials';

function buildCommandUrl(
  host: string,
  orgSlug: string,
  commandId: string,
): string {
  return `${host}/org/${orgSlug}/space/global/commands/${commandId}`;
}

export type ListCommandsHandlerDependencies = {
  packmindCliHexa: PackmindCliHexa;
  exit: (code: number) => void;
  log: typeof console.log;
  error: typeof console.error;
};

export async function listCommandsHandler(
  deps: ListCommandsHandlerDependencies,
): Promise<void> {
  const { packmindCliHexa, exit, log, error } = deps;

  try {
    log('Fetching commands...\n');
    const commands = await packmindCliHexa.listCommands({});

    if (commands.length === 0) {
      log('No commands found.');
      exit(0);
      return;
    }

    const sortedCommands = [...commands].sort((a, b) =>
      a.slug.localeCompare(b.slug),
    );

    // Try to build webapp URL from credentials
    let urlBuilder: ((id: string) => string) | null = null;
    const apiKey = loadApiKey();
    if (apiKey) {
      const decoded = decodeApiKey(apiKey);
      const orgSlug = decoded?.jwt?.organization?.slug;
      if (decoded?.host && orgSlug) {
        urlBuilder = (id: string) => buildCommandUrl(decoded.host, orgSlug, id);
      }
    }

    log(formatHeader(`📋 Commands (${sortedCommands.length})\n`));
    sortedCommands.forEach((cmd, index) => {
      log(`  ${formatSlug(cmd.slug)}`);
      log(`  ${formatLabel('Name:')}  ${cmd.name}`);
      if (urlBuilder) {
        const url = urlBuilder(cmd.id);
        log(
          `  ${formatLabel('Link:')}  ${formatLink(url, 'Open in Packmind')}`,
        );
      }
      if (index < sortedCommands.length - 1) {
        log('');
      }
    });

    exit(0);
  } catch (err) {
    error('\n❌ Failed to list commands:');
    if (err instanceof Error) {
      error(`   ${err.message}`);
    } else {
      error(`   ${String(err)}`);
    }
    exit(1);
  }
}
