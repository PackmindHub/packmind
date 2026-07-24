import { GitProviderId } from '@packmind/types';
import {
  logInfoConsole,
  logSuccessConsole,
  logErrorConsole,
} from '../../utils/consoleLogger';
import { PackmindCliHexa } from '../../../PackmindCliHexa';

export type AddGitRepoHandlerDependencies = {
  packmindCliHexa: PackmindCliHexa;
  connectionId: GitProviderId;
  repository: string;
  branch?: string;
  exit: (code: number) => void;
};

function parseOwnerRepo(
  repository: string,
): { owner: string; repo: string } | null {
  const parts = repository.split('/');
  if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) {
    return null;
  }
  return { owner: parts[0].trim(), repo: parts[1].trim() };
}

async function resolveDefaultBranch(
  deps: AddGitRepoHandlerDependencies,
  owner: string,
  repo: string,
): Promise<string | null> {
  let page = 1;
  for (;;) {
    const response = await deps.packmindCliHexa.listAvailableGitRepos(
      deps.connectionId,
      page,
    );
    const match = response.repositories.find(
      (candidate) => candidate.owner === owner && candidate.name === repo,
    );
    if (match) {
      return match.defaultBranch;
    }
    if (page >= response.availablePages) {
      return null;
    }
    page += 1;
  }
}

export async function addGitRepoHandler(
  deps: AddGitRepoHandlerDependencies,
): Promise<void> {
  const { packmindCliHexa, connectionId, repository, branch, exit } = deps;

  try {
    const parsed = parseOwnerRepo(repository);
    if (!parsed) {
      logErrorConsole(
        `Invalid repository "${repository}". Expected format: owner/repo.`,
      );
      exit(1);
      return;
    }
    const { owner, repo } = parsed;

    let resolvedBranch = branch;
    if (!resolvedBranch) {
      logInfoConsole(`Resolving default branch for ${owner}/${repo}...`);
      const defaultBranch = await resolveDefaultBranch(deps, owner, repo);
      if (!defaultBranch) {
        logErrorConsole(
          `Could not determine the default branch for ${owner}/${repo}. Re-run with --branch to specify it.`,
        );
        exit(1);
        return;
      }
      resolvedBranch = defaultBranch;
    }

    logInfoConsole(`Adding ${owner}/${repo} (${resolvedBranch})...`);
    const created = await packmindCliHexa.addGitRepo({
      gitProviderId: connectionId,
      owner,
      repo,
      branch: resolvedBranch,
    });

    logSuccessConsole(
      `Repository added: ${created.owner}/${created.repo} (${created.branch})`,
    );
    exit(0);
  } catch (err) {
    logErrorConsole('Failed to add repository:');
    if (err instanceof Error) {
      logErrorConsole(err.message);
    } else {
      logErrorConsole(String(err));
    }
    exit(1);
  }
}
