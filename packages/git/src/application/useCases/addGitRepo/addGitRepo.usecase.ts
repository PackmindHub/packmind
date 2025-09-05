import { GitProviderService } from '../../GitProviderService';
import { GitRepoService } from '../../GitRepoService';
import {
  AddGitRepoCommand,
  IAddGitRepoUseCase,
} from '../../../domain/useCases/IAddGitRepo';
import { GitRepo } from '../../../domain/entities/GitRepo';
import { createOrganizationId } from '@packmind/shared';

export class AddGitRepoUseCase implements IAddGitRepoUseCase {
  constructor(
    private readonly gitProviderService: GitProviderService,
    private readonly gitRepoService: GitRepoService,
  ) {}

  async execute(command: AddGitRepoCommand): Promise<GitRepo> {
    const { organizationId, gitProviderId, owner, repo, branch } = command;

    // Business rule: gitProviderId is required
    if (!gitProviderId) {
      throw new Error('Git provider ID is required');
    }

    // Business rule: repo data must be complete
    if (!owner || !repo || !branch) {
      throw new Error('Owner, repository name, and branch are all required');
    }

    // Business rule: git provider must exist before adding a repo
    const gitProvider =
      await this.gitProviderService.findGitProviderById(gitProviderId);
    if (!gitProvider) {
      throw new Error('Git provider not found');
    }

    // Business rule: git provider must belong to the same organization
    if (gitProvider.organizationId !== organizationId) {
      throw new Error(
        'Git provider does not belong to the specified organization',
      );
    }

    // Business rule: check for duplicate repositories (same owner/repo/branch combination in same organization)
    const existingRepo =
      await this.gitRepoService.findGitRepoByOwnerRepoAndBranchInOrganization(
        owner,
        repo,
        branch,
        createOrganizationId(organizationId),
      );

    if (existingRepo) {
      throw new Error(
        `Repository ${owner}/${repo} on branch '${branch}' already exists in this organization`,
      );
    }

    // Create the repository with provider association
    const gitRepoWithProvider = {
      owner,
      repo,
      branch,
      providerId: gitProviderId,
    };

    return this.gitRepoService.addGitRepo(gitRepoWithProvider);
  }
}
