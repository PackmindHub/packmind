import { PackmindCliHexa } from '../../PackmindCliHexa';
import { formatSlug, formatLabel } from '../utils/consoleLogger';

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

    log('Available commands:\n');
    sortedCommands.forEach((cmd, index) => {
      log(`- 🔗 ${formatSlug(cmd.slug)}`);
      log(`    ${formatLabel('Name:')} ${cmd.name}`);
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
