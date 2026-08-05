import { GitProviderVendor } from '@packmind/types';
import {
  ITrackRepositoryUseCase,
  TrackRepositoryCommand,
  TrackRepositoryResult,
} from '../../../domain/useCases/trackRepository/ITrackRepositoryUseCase';
import { IRepositoryTrackingGateway } from '../../../domain/repositories/IRepositoryTrackingGateway';
import { IGitService } from '../../../domain/services/IGitService';

/**
 * Parse a git remote URL to extract owner and repo.
 * Mirrors the backend `parseGitRepoInfo` helper so both sides agree.
 */
export function parseOwnerRepo(gitRemoteUrl: string): {
  owner: string;
  repo: string;
} {
  const match = gitRemoteUrl.match(/[/:]([^/:]+)\/([^/]+?)(?:\.git)?\/?$/i);

  if (!match) {
    throw new Error(`Unable to parse git remote URL: ${gitRemoteUrl}`);
  }

  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/, ''),
  };
}

/**
 * Infer the git provider vendor from a remote URL.
 */
export function parseProviderVendor(gitRemoteUrl: string): GitProviderVendor {
  const normalized = gitRemoteUrl.toLowerCase();
  if (normalized.includes('github.com')) {
    return 'github';
  }
  if (normalized.includes('gitlab.com')) {
    return 'gitlab';
  }
  return 'unknown';
}

/**
 * Orchestrates setting or moving the tracked repository+branch. Shared by both
 * the `track` command and the `init` tracking prompt. Business-only: no console
 * output, no inquirer — confirmation is delegated to the `confirm` callback.
 */
export class TrackRepositoryUseCase implements ITrackRepositoryUseCase {
  constructor(
    private readonly gateway: IRepositoryTrackingGateway,
    private readonly gitService: IGitService,
  ) {}

  public async execute(
    command: TrackRepositoryCommand,
  ): Promise<TrackRepositoryResult> {
    const { repoPath, origin, update, remove, confirm } = command;

    // Derive owner/repo/branch from the local git repository. These throw with
    // a clear message when not in a git repo or when there is no remote.
    const { gitRemoteUrl } = this.gitService.getGitRemoteUrl(repoPath);
    const { branch } = this.gitService.getCurrentBranch(repoPath);
    const { owner, repo } = parseOwnerRepo(gitRemoteUrl);
    const providerVendor = parseProviderVendor(gitRemoteUrl);

    // Read the current tracking state. Also the single point where a disabled
    // feature flag surfaces (server returns 404).
    const { gitRepo: tracked } = await this.gateway.getTrackedRepository({
      owner,
      repo,
    });

    if (remove) {
      // Confirm only when there is something to remove. When nothing is
      // tracked, call through regardless: the server is the single authority on
      // whether the repository is merely untracked (a warning) or unknown (an
      // error), which is also what makes repeating the command harmless.
      if (tracked) {
        const confirmed = await confirm({
          mode: 'remove',
          owner,
          repo,
          branch: tracked.branch,
        });
        if (!confirmed) {
          return { status: 'cancelled' };
        }
      }

      const response = await this.gateway.removeTrackedRepository({
        owner,
        repo,
      });

      if (response.status === 'not-tracked') {
        return {
          status: 'not-tracked',
          owner,
          repo,
          organizationName: response.organizationName,
        };
      }

      return {
        status: 'removed',
        owner,
        repo,
        branch: response.gitRepo.branch,
      };
    }

    if (update) {
      if (!tracked) {
        return { status: 'nothing-tracked', owner, repo, branch };
      }
      if (tracked.branch === branch) {
        return { status: 'already-tracked-same-branch', owner, repo, branch };
      }

      const confirmed = await confirm({
        mode: 'update',
        owner,
        repo,
        branch,
        fromBranch: tracked.branch,
      });
      if (!confirmed) {
        return { status: 'cancelled' };
      }

      const gitRepo = await this.gateway.updateTrackedBranch({
        owner,
        repo,
        branch,
      });
      return {
        status: 'updated',
        owner,
        repo,
        branch,
        fromBranch: tracked.branch,
        gitRepo,
      };
    }

    // Set path.
    if (tracked) {
      if (tracked.branch === branch) {
        return { status: 'already-tracked-same-branch', owner, repo, branch };
      }
      return {
        status: 'already-tracked-other-branch',
        owner,
        repo,
        branch,
        trackedBranch: tracked.branch,
      };
    }

    const confirmed = await confirm({ mode: 'set', owner, repo, branch });
    if (!confirmed) {
      return { status: 'cancelled' };
    }

    const gitRepo = await this.gateway.setTrackedRepository({
      owner,
      repo,
      branch,
      origin,
      providerVendor,
      gitRemoteUrl,
    });
    return { status: 'set', owner, repo, branch, gitRepo };
  }
}
