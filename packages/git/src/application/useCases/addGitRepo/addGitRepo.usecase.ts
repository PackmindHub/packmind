import { GitProviderService } from '../../GitProviderService';
import { GitRepoService } from '../../GitRepoService';
import {
  AddGitRepoCommand,
  IAddGitRepoUseCase,
} from '../../../domain/useCases/IAddGitRepo';
import { GitRepo } from '../../../domain/entities/GitRepo';
import {
  createOrganizationId,
  IDeploymentPort,
  createUserId,
  GitRepoAlreadyExistsError,
  GitProviderNotFoundError,
  GitProviderOrganizationMismatchError,
  PackmindLogger,
} from '@packmind/shared';

const origin = 'AddGitRepoUseCase';

export class AddGitRepoUseCase implements IAddGitRepoUseCase {
  constructor(
    private readonly gitProviderService: GitProviderService,
    private readonly gitRepoService: GitRepoService,
    private readonly deploymentsAdapter?: IDeploymentPort,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(command: AddGitRepoCommand): Promise<GitRepo> {
    const { organizationId, gitProviderId, owner, repo, branch, userId } =
      command;

    // Check deployment port availability at the beginning
    if (!this.deploymentsAdapter) {
      throw new Error('DeploymentsAdapter is not available');
    }

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
      this.logger.error('Git provider not found', {
        gitProviderId,
        organizationId,
        userId,
      });
      throw new GitProviderNotFoundError(gitProviderId);
    }

    // Business rule: git provider must belong to the same organization
    if (gitProvider.organizationId !== organizationId) {
      this.logger.error('Git provider does not belong to organization', {
        gitProviderId,
        providerOrganizationId: gitProvider.organizationId,
        requestedOrganizationId: organizationId,
        userId,
      });
      throw new GitProviderOrganizationMismatchError(
        gitProviderId,
        organizationId,
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
      this.logger.error('Repository already exists in organization', {
        owner,
        repo,
        branch,
        organizationId,
        gitProviderId,
        userId,
        existingRepoId: existingRepo.id,
      });
      throw new GitRepoAlreadyExistsError(owner, repo, branch, organizationId);
    }

    // Create the repository with provider association
    const gitRepoWithProvider = {
      owner,
      repo,
      branch,
      providerId: gitProviderId,
    };

    const createdRepo =
      await this.gitRepoService.addGitRepo(gitRepoWithProvider);

    await this.deploymentsAdapter.addTarget({
      userId: createUserId(userId),
      organizationId: createOrganizationId(organizationId),
      name: 'Default',
      path: '/',
      gitRepoId: createdRepo.id,
    });

    return createdRepo;
  }
}
