import {
  CheckTrackedBranchExistsCommand,
  CheckTrackedBranchExistsResponse,
  ICheckTrackedBranchExistsUseCase,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { Cache } from '@packmind/node-utils';
import { GitRepoService } from '../../GitRepoService';
import { CheckBranchExistsUseCase } from '../checkBranchExists/CheckBranchExistsUseCase';

const origin = 'CheckTrackedBranchExistsUseCase';

/**
 * How long an answer about a tracked branch is reused. A branch deleted with a
 * merged pull request does not come back, and a branch that exists rarely stops
 * existing, so freshness matters far less here than not spending one provider
 * API call per repository per page load.
 */
const CACHE_EXPIRATION_SECONDS = 300;

/**
 * Whether the branch a repository is tracked on still exists on its Git
 * provider. The branch is read from the stored repository rather than supplied
 * by the caller, so the question can only ever be asked about the branch
 * Packmind actually records distributions on.
 *
 * Cached deliberately at this level rather than inside CheckBranchExistsUseCase:
 * the marketplace publish flow asks that use case about a branch it creates and
 * deletes within one run, and must keep getting a live answer.
 */
export class CheckTrackedBranchExistsUseCase implements ICheckTrackedBranchExistsUseCase {
  private readonly cache: Cache;

  constructor(
    private readonly gitRepoService: GitRepoService,
    private readonly checkBranchExists: CheckBranchExistsUseCase,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.cache = Cache.getInstance();
  }

  async execute(
    command: CheckTrackedBranchExistsCommand,
  ): Promise<CheckTrackedBranchExistsResponse> {
    const { repositoryId } = command;

    if (!repositoryId) {
      throw new Error('Repository ID is required');
    }

    const gitRepo = await this.gitRepoService.findGitRepoById(repositoryId);

    if (!gitRepo) {
      throw new Error(`Repository with ID ${repositoryId} not found`);
    }

    // The branch is part of the key, so moving tracking asks the provider again
    // instead of inheriting the previous branch's answer.
    const cacheKey = `tracked-branch-exists:${gitRepo.id}:${gitRepo.branch}`;

    const cached = await this.cache.get<boolean>(cacheKey);

    if (cached !== null) {
      this.logger.debug('Tracked branch existence retrieved from cache', {
        gitRepoId: gitRepo.id,
        branch: gitRepo.branch,
        exists: cached,
      });
      return { exists: cached };
    }

    const exists = await this.checkBranchExists.execute({
      gitProviderId: gitRepo.providerId,
      owner: gitRepo.owner,
      repo: gitRepo.repo,
      branch: gitRepo.branch,
    });

    await this.cache.set(cacheKey, exists, CACHE_EXPIRATION_SECONDS);

    this.logger.info('Checked whether the tracked branch still exists', {
      gitRepoId: gitRepo.id,
      owner: gitRepo.owner,
      repo: gitRepo.repo,
      branch: gitRepo.branch,
      exists,
    });

    return { exists };
  }
}
