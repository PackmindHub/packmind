import {
  ITrackRepositoryUseCase,
  TrackRepositoryCommand,
  TrackRepositoryResult,
} from '../../../domain/useCases/trackRepository/ITrackRepositoryUseCase';
import { IRepositoryTrackingGateway } from '../../../domain/repositories/IRepositoryTrackingGateway';
import { IGitService } from '../../../domain/services/IGitService';

// `scheme://[user@]host[:port]/path`: https, http, ssh, git+ssh alike.
const SCHEME_URL_PATH = /^[a-z][a-z0-9+.-]*:\/\/[^/]+\/(.+)$/i;
// scp-like SSH, `[user@]host:path`, which git writes without a scheme.
const SCP_LIKE_PATH = /^(?:[^@/\s]+@)?[^/:\s]+:(?!\/\/)(.+)$/;

/**
 * Parse a git remote URL to extract owner and repo. The repo is the last path
 * segment and the owner everything before it, so a GitLab subgroup stays whole.
 * Mirrors the backend `parseGitRepoInfo` helper so both sides agree.
 */
export function parseOwnerRepo(gitRemoteUrl: string): {
  owner: string;
  repo: string;
} {
  const path = (gitRemoteUrl.trim().match(SCHEME_URL_PATH) ??
    gitRemoteUrl.trim().match(SCP_LIKE_PATH))?.[1];

  // An scp-like remote may name an absolute path: `git@host:/group/repo.git`.
  const segments = path
    ?.replace(/^\/+|\/+$/g, '')
    .replace(/\.git$/i, '')
    .split('/');

  if (!segments || segments.length < 2 || segments.some((s) => s === '')) {
    throw new Error(`Unable to parse git remote URL: ${gitRemoteUrl}`);
  }

  return {
    owner: segments.slice(0, -1).join('/'),
    repo: segments[segments.length - 1],
  };
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
    const {
      repoPath,
      origin,
      update,
      remove,
      branch: requestedBranch,
      confirm,
    } = command;

    // Derive owner/repo from the local git repository. These throw with a clear
    // message when not in a git repo or when there is no remote.
    const { gitRemoteUrl } = this.gitService.getGitRemoteUrl(repoPath);
    // The branch is explicit when given, otherwise the checked-out one. Reading
    // HEAD unconditionally keeps the "not a git repository" error identical for
    // both paths.
    const { branch: currentBranch, detached } =
      this.gitService.getCurrentBranch(repoPath);
    const branch = requestedBranch ?? currentBranch;
    const { owner, repo } = parseOwnerRepo(gitRemoteUrl);

    // Falling back to the checked-out branch is meaningless with a detached
    // HEAD: git names it `HEAD`, and tracking that would record nothing under a
    // branch nobody has. Removal is unaffected — it takes no branch at all.
    if (detached && !requestedBranch && !remove) {
      return { status: 'detached-head', owner, repo };
    }

    // A branch that does not exist used to be tracked silently, and only
    // surfaced later as distributions that were never recorded. Only an
    // explicitly requested branch is checked — the checked-out one exists by
    // construction — and it is checked before reading the tracking state so a
    // typo costs no round trip.
    if (
      requestedBranch &&
      !this.gitService.branchExists(repoPath, requestedBranch)
    ) {
      return { status: 'branch-not-found', owner, repo, branch };
    }

    // Read the current tracking state. Also the single point where a server
    // predating repository tracking surfaces (it has no route, so 404).
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
      gitRemoteUrl,
    });
    return { status: 'set', owner, repo, branch, gitRepo };
  }
}
