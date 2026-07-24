import { GitProviderListItem } from '@packmind/types';
import {
  logConsole,
  logInfoConsole,
  logErrorConsole,
  formatSlug,
  formatLabel,
} from '../../utils/consoleLogger';
import { PackmindCliHexa } from '../../../PackmindCliHexa';

export type ListGitConnectionsHandlerDependencies = {
  packmindCliHexa: PackmindCliHexa;
  exit: (code: number) => void;
};

function displayConnection(connection: GitProviderListItem): void {
  const name = connection.displayName?.trim() || '(unnamed)';
  logConsole(`- ${formatSlug(name)}`);
  logConsole(`    ${formatLabel('ID:')}   ${connection.id}`);
  logConsole(`    ${formatLabel('Type:')} ${connection.source}`);
  if (connection.url) {
    logConsole(`    ${formatLabel('URL:')}  ${connection.url}`);
  }
  logConsole(
    `    ${formatLabel('Auth:')} ${connection.hasAuth ? 'Connected' : 'Not connected'}`,
  );
  logConsole('');
}

export async function listGitConnectionsHandler(
  deps: ListGitConnectionsHandlerDependencies,
): Promise<void> {
  const { packmindCliHexa, exit } = deps;

  try {
    logInfoConsole('Fetching git connections...');
    const connections = await packmindCliHexa.listGitConnections();

    if (!connections || connections.length === 0) {
      logConsole('No git connections found.');
      exit(0);
      return;
    }

    logConsole('\nGit connections:\n');
    const sorted = [...connections].sort((a, b) =>
      a.displayName.localeCompare(b.displayName),
    );
    for (const connection of sorted) {
      displayConnection(connection);
    }

    exit(0);
  } catch (err) {
    logErrorConsole('Failed to list git connections:');
    if (err instanceof Error) {
      logErrorConsole(err.message);
    } else {
      logErrorConsole(String(err));
    }
    exit(1);
  }
}
