import { PackmindCliHexa } from '../../PackmindCliHexa';
import { ILockFileRepository } from '../../domain/repositories/ILockFileRepository';
import {
  formatSlug,
  formatLabel,
  formatHeader,
  logWarningConsole,
} from '../utils/consoleLogger';
import { loadApiKey, decodeApiKey } from '../utils/credentials';
import {
  renderArtifactFiles,
  formatAgentsHeader,
} from '../utils/renderArtifactFiles';

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
  files?: boolean;
  lockFileRepository?: ILockFileRepository;
  getCwd?: () => string;
};

export async function listCommandsHandler(
  deps: ListCommandsHandlerDependencies,
): Promise<void> {
  const {
    packmindCliHexa,
    exit,
    log,
    error,
    files,
    lockFileRepository,
    getCwd,
  } = deps;

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

    // Read lock files if --files flag is passed
    const lockFiles =
      files && lockFileRepository && getCwd
        ? await lockFileRepository.readAll(getCwd())
        : [];

    if (files && lockFiles.length === 0) {
      logWarningConsole(
        "No packmind-lock.json found. Run 'packmind install' first.",
      );
    }

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

    const agentsHeader =
      files && lockFiles.length > 0 ? formatAgentsHeader(lockFiles) : '';
    log(
      formatHeader(`📋 Commands (${sortedCommands.length})${agentsHeader}\n`),
    );

    sortedCommands.forEach((cmd, index) => {
      log(`  ${formatSlug(cmd.slug)}  ${formatLabel(`"${cmd.name}"`)}`);
      if (urlBuilder) {
        const url = urlBuilder(cmd.id);
        log(`  ${formatLabel('Link:')}  ${url}`);
      }
      if (files && lockFiles.length > 0) {
        renderArtifactFiles(lockFiles, 'command', cmd.slug, log);
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
