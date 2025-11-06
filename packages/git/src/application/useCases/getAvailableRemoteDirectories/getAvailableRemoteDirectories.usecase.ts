import { GitProviderService } from '../../GitProviderService';
import {
  GetAvailableRemoteDirectoriesCommand,
  IGetAvailableRemoteDirectoriesUseCase,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { Cache } from '@packmind/node-utils';

const origin = 'GetAvailableRemoteDirectoriesUseCase';

export class GetAvailableRemoteDirectoriesUseCase
  implements IGetAvailableRemoteDirectoriesUseCase
{
  private readonly cache: Cache;

  constructor(
    private readonly gitProviderService: GitProviderService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.cache = Cache.getInstance();
  }

  async execute(
    command: GetAvailableRemoteDirectoriesCommand,
  ): Promise<string[]> {
    const { organizationId, gitRepo, path } = command;

    // Business rule: GitRepo must be provided
    if (!gitRepo) {
      throw new Error('Git repository is required');
    }

    // Business rule: organizationId must be valid
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    // Business rule: GitRepo must have a provider
    if (!gitRepo.providerId) {
      throw new Error('Git repository must have a provider ID');
    }

    // Create cache key based on git repository ID and path (for different results per path)
    const pathString = path && path !== '/' ? path : 'root';
    const cacheKey = `available-remote-directories:${gitRepo.id}:${pathString}`;

    this.logger.info('Getting available targets from repository', {
      organizationId,
      gitRepoId: gitRepo.id,
      owner: gitRepo.owner,
      repo: gitRepo.repo,
      branch: gitRepo.branch,
      path: path || '/',
      cacheKey,
    });

    try {
      // First, try to get from cache
      const cachedTargets = await this.cache.get<string[]>(cacheKey);

      if (cachedTargets !== null) {
        this.logger.info('Available targets retrieved from cache', {
          organizationId,
          gitRepoId: gitRepo.id,
          cacheKey,
          targetCount: cachedTargets.length,
        });
        return cachedTargets;
      }

      // Cache miss - get available targets using the specific git provider for this repository
      const availableTargets =
        await this.gitProviderService.listAvailableTargets(gitRepo, path);

      await this.cache.set(cacheKey, availableTargets);

      this.logger.info('Successfully retrieved and cached available targets', {
        organizationId,
        gitRepoId: gitRepo.id,
        owner: gitRepo.owner,
        repo: gitRepo.repo,
        branch: gitRepo.branch,
        path: path || '/',
        targetCount: availableTargets.length,
        cacheKey,
      });

      return availableTargets;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to get available targets', {
        organizationId,
        gitRepoId: gitRepo.id,
        owner: gitRepo.owner,
        repo: gitRepo.repo,
        branch: gitRepo.branch,
        error: errorMessage,
      });
      throw new Error(`Failed to get available targets: ${errorMessage}`);
    }
  }
}
