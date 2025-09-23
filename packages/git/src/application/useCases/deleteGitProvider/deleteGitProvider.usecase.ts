import { GitProviderService } from '../../GitProviderService';
import { GitRepoService } from '../../GitRepoService';
import { GitProviderId } from '../../../domain/entities/GitProvider';
import { UserId } from '@packmind/accounts';
import {
  GitProviderNotFoundError,
  GitProviderHasRepositoriesError,
  PackmindLogger,
} from '@packmind/shared';

export interface DeleteGitProviderUseCaseInput {
  id: GitProviderId;
  userId: UserId;
  force?: boolean; // Optional flag to force deletion even with dependencies
}

const origin = 'DeleteGitProviderUseCase';

export class DeleteGitProviderUseCase {
  constructor(
    private readonly gitProviderService: GitProviderService,
    private readonly gitRepoService: GitRepoService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(input: DeleteGitProviderUseCaseInput): Promise<void> {
    const { id, userId, force = false } = input;

    // Business rule: provider ID is required
    if (!id) {
      throw new Error('Git provider ID is required');
    }

    // Business rule: provider must exist
    const gitProvider = await this.gitProviderService.findGitProviderById(id);
    if (!gitProvider) {
      this.logger.error('Git provider not found', {
        gitProviderId: id,
        userId,
      });
      throw new GitProviderNotFoundError(id);
    }

    // Business rule: check for dependent repositories before deletion
    const dependentRepos =
      await this.gitRepoService.findGitReposByProviderId(id);
    if (dependentRepos.length > 0 && !force) {
      this.logger.error(
        'Cannot delete git provider with associated repositories',
        {
          gitProviderId: id,
          userId,
          repositoryCount: dependentRepos.length,
          repositoryIds: dependentRepos.map((repo) => repo.id),
          organizationId: gitProvider.organizationId,
        },
      );
      throw new GitProviderHasRepositoriesError(id, dependentRepos.length);
    }

    // Business rule: if force deletion, remove all dependent repositories first
    if (dependentRepos.length > 0 && force) {
      for (const repo of dependentRepos) {
        await this.gitRepoService.deleteGitRepo(repo.id, userId);
      }
    }

    // Delete the git provider
    await this.gitProviderService.deleteGitProvider(id, userId);
  }
}
