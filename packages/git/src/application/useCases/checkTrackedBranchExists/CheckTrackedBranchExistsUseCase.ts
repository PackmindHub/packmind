import {
  CheckTrackedBranchExistsCommand,
  CheckTrackedBranchExistsResponse,
  GitRepoNotFoundError,
  IAccountsPort,
  ICheckTrackedBranchExistsUseCase,
  MissingGitInputError,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import {
  AbstractMemberUseCase,
  Cache,
  MemberContext,
} from '@packmind/node-utils';
import { GitProviderService } from '../../GitProviderService';
import { GitRepoService } from '../../GitRepoService';
import { CheckBranchExistsUseCase } from '../checkBranchExists/CheckBranchExistsUseCase';

const origin = 'CheckTrackedBranchExistsUseCase';

/**
 * Tracked branches rarely appear or disappear, so freshness matters far less
 * here than not spending one provider API call per repository per page load.
 */
const CACHE_EXPIRATION_SECONDS = 300;

/**
 * Whether the branch a repository is tracked on still exists on its Git
 * provider. The branch comes from the stored repository, never from the caller,
 * so the question can only be asked about the branch Packmind records
 * distributions on.
 *
 * Cached here rather than inside CheckBranchExistsUseCase: the marketplace
 * publish flow asks that use case about a branch it creates and deletes within
 * one run, and must keep getting a live answer.
 */
export class CheckTrackedBranchExistsUseCase
  extends AbstractMemberUseCase<
    CheckTrackedBranchExistsCommand,
    CheckTrackedBranchExistsResponse
  >
  implements ICheckTrackedBranchExistsUseCase
{
  private readonly cache: Cache;

  constructor(
    private readonly gitRepoService: GitRepoService,
    private readonly gitProviderService: GitProviderService,
    private readonly checkBranchExists: CheckBranchExistsUseCase,
    accountsAdapter: IAccountsPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsAdapter, logger);
    this.cache = Cache.getInstance();
  }

  protected async executeForMembers(
    command: CheckTrackedBranchExistsCommand & MemberContext,
  ): Promise<CheckTrackedBranchExistsResponse> {
    const { repositoryId, organization, userId } = command;

    if (!repositoryId) {
      throw new MissingGitInputError('Repository ID');
    }

    const gitRepo = await this.gitRepoService.findGitRepoById(repositoryId);

    if (!gitRepo) {
      throw new GitRepoNotFoundError(repositoryId);
    }

    // A repository is owned through its provider. One owned by another
    // organization and one that does not exist are the same answer by design,
    // and the check comes before the cache, whose answer is not scoped.
    const gitProvider = await this.gitProviderService.findGitProviderById(
      gitRepo.providerId,
    );

    if (!gitProvider || gitProvider.organizationId !== organization.id) {
      this.logger.error('Git repository not found in organization', {
        gitRepoId: repositoryId,
        providerOrganizationId: gitProvider?.organizationId ?? null,
        requestedOrganizationId: organization.id,
        userId,
      });
      throw new GitRepoNotFoundError(repositoryId);
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
