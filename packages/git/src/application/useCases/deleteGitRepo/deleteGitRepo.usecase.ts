import { GitProviderService } from '../../GitProviderService';
import { GitRepoService } from '../../GitRepoService';
import { GitProviderId } from '../../../domain/entities/GitProvider';
import { GitRepoId } from '../../../domain/entities/GitRepo';
import { UserId } from '@packmind/accounts';

export interface DeleteGitRepoUseCaseInput {
  repositoryId: GitRepoId;
  userId: UserId;
  providerId?: GitProviderId; // Optional validation - ensure repo belongs to this provider
}

export class DeleteGitRepoUseCase {
  constructor(
    private readonly gitProviderService: GitProviderService,
    private readonly gitRepoService: GitRepoService,
  ) {}

  async execute(input: DeleteGitRepoUseCaseInput): Promise<void> {
    const { repositoryId, userId, providerId } = input;

    // Business rule: repository ID is required
    if (!repositoryId) {
      throw new Error('Repository ID is required');
    }

    // Business rule: repository must exist
    const repository = await this.gitRepoService.findGitRepoById(repositoryId);
    if (!repository) {
      throw new Error('Repository not found');
    }

    // Business rule: if providerId is specified, validate ownership
    if (providerId && repository.providerId !== providerId) {
      throw new Error('Repository does not belong to the specified provider');
    }

    // Business rule: validate that the associated provider exists
    const gitProvider = await this.gitProviderService.findGitProviderById(
      repository.providerId,
    );
    if (!gitProvider) {
      throw new Error('Git provider not found for this repository');
    }

    // Delete the repository
    await this.gitRepoService.deleteGitRepo(repositoryId, userId);
  }
}
