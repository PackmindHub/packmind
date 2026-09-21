import { GitProviderService } from '../../GitProviderService';
import {
  GetAvailableRemoteDirectoriesCommand,
  IGetAvailableRemoteDirectoriesUseCase,
  MissingGitInputError,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { Cache } from '@packmind/node-utils';
import { AvailableRemoteDirectoriesFailedError } from '../../../domain/errors/AvailableRemoteDirectoriesFailedError';
import { GitRepoProviderNotConfiguredError } from '../../../domain/errors/GitRepoProviderNotConfiguredError';

const origin = 'GetAvailableRemoteDirectoriesUseCase';

export class GetAvailableRemoteDirectoriesUseCase implements IGetAvailableRemoteDirectoriesUseCase {
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

    if (!gitRepo) {
      throw new MissingGitInputError('Git repository');
    }

    if (!organizationId) {
      throw new MissingGitInputError('Organization ID');
    }

    if (!gitRepo.providerId) {
      throw new GitRepoProviderNotConfiguredError(gitRepo.id);
    }

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
      throw new AvailableRemoteDirectoriesFailedError(
        organizationId,
        gitRepo.id,
        error,
      );
    }
  }
}
