import { GitProviderService } from '../../GitProviderService';
import { GitRepoService } from '../../GitRepoService';
import { GitProviderId } from '../../../domain/entities/GitProvider';
import { UserId } from '@packmind/accounts';

export interface DeleteGitProviderUseCaseInput {
  id: GitProviderId;
  userId: UserId;
  force?: boolean; // Optional flag to force deletion even with dependencies
}

export class DeleteGitProviderUseCase {
  constructor(
    private readonly gitProviderService: GitProviderService,
    private readonly gitRepoService: GitRepoService,
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
      throw new Error('Git provider not found');
    }

    // Business rule: check for dependent repositories before deletion
    const dependentRepos =
      await this.gitRepoService.findGitReposByProviderId(id);
    if (dependentRepos.length > 0 && !force) {
      throw new Error(
        `Cannot delete git provider: ${dependentRepos.length} repositories are still associated with this provider. Use force=true to delete anyway.`,
      );
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
