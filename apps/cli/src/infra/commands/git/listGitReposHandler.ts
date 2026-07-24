import { ExternalRepository, GitProviderId, GitRepo } from '@packmind/types';
import {
  logConsole,
  logInfoConsole,
  logErrorConsole,
  formatSlug,
  formatLabel,
} from '../../utils/consoleLogger';
import { PackmindCliHexa } from '../../../PackmindCliHexa';

export type ListGitReposHandlerDependencies = {
  packmindCliHexa: PackmindCliHexa;
  connectionId: GitProviderId;
  showAvailable: boolean;
  page?: number;
  exit: (code: number) => void;
};

function displayManagedRepo(repo: GitRepo): void {
  logConsole(`- ${formatSlug(`${repo.owner}/${repo.repo}`)}`);
  logConsole(`    ${formatLabel('Branch:')} ${repo.branch}`);
  logConsole(`    ${formatLabel('ID:')}     ${repo.id}`);
  logConsole('');
}

function displayAvailableRepo(repo: ExternalRepository): void {
  logConsole(`- ${formatSlug(`${repo.owner}/${repo.name}`)}`);
  logConsole(`    ${formatLabel('Default branch:')} ${repo.defaultBranch}`);
  logConsole(
    `    ${formatLabel('Visibility:')}     ${repo.private ? 'private' : 'public'}`,
  );
  logConsole('');
}

async function listAvailable(
  deps: ListGitReposHandlerDependencies,
): Promise<void> {
  const { packmindCliHexa, connectionId, page, exit } = deps;

  logInfoConsole('Fetching repositories available to manage...');
  const response = await packmindCliHexa.listAvailableGitRepos(
    connectionId,
    page,
  );

  if (response.repositories.length === 0) {
    logConsole('No repositories available to manage.');
    exit(0);
    return;
  }

  logConsole(
    `\nAvailable repositories (page ${response.currentPage}/${response.availablePages}):\n`,
  );
  for (const repo of response.repositories) {
    displayAvailableRepo(repo);
  }

  exit(0);
}

async function listManaged(
  deps: ListGitReposHandlerDependencies,
): Promise<void> {
  const { packmindCliHexa, connectionId, exit } = deps;

  logInfoConsole('Fetching managed repositories...');
  const repos = await packmindCliHexa.listGitRepos(connectionId);

  if (repos.length === 0) {
    logConsole('No managed repositories found for this connection.');
    exit(0);
    return;
  }

  logConsole('\nManaged repositories:\n');
  const sorted = [...repos].sort((a, b) =>
    `${a.owner}/${a.repo}`.localeCompare(`${b.owner}/${b.repo}`),
  );
  for (const repo of sorted) {
    displayManagedRepo(repo);
  }

  exit(0);
}

export async function listGitReposHandler(
  deps: ListGitReposHandlerDependencies,
): Promise<void> {
  try {
    if (deps.showAvailable) {
      await listAvailable(deps);
    } else {
      await listManaged(deps);
    }
  } catch (err) {
    logErrorConsole('Failed to list repositories:');
    if (err instanceof Error) {
      logErrorConsole(err.message);
    } else {
      logErrorConsole(String(err));
    }
    deps.exit(1);
  }
}
