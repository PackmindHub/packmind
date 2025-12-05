import { PackmindLogger } from '@packmind/logger';
import { AbstractAdminUseCase, AdminContext } from '@packmind/node-utils';
import {
  AddGitRepoCommand,
  createUserId,
  GitProviderMissingTokenError,
  GitProviderNotFoundError,
  GitProviderOrganizationMismatchError,
  GitRepo,
  GitRepoAlreadyExistsError,
  IAccountsPort,
  IAddGitRepoUseCase,
  IDeploymentPort,
} from '@packmind/types';
import { GitProviderService } from '../../GitProviderService';
import { GitRepoService } from '../../GitRepoService';

const origin = 'AddGitRepoUseCase';

export class AddGitRepoUseCase
  extends AbstractAdminUseCase<AddGitRepoCommand, GitRepo>
  implements IAddGitRepoUseCase
{
  constructor(
    private readonly gitProviderService: GitProviderService,
    private readonly gitRepoService: GitRepoService,
    accountsAdapter: IAccountsPort,
    private readonly deploymentsAdapter: IDeploymentPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsAdapter, logger);
  }

  protected async executeForAdmins(
    command: AddGitRepoCommand & AdminContext,
  ): Promise<GitRepo> {
    const {
      organization,
      gitProviderId,
      owner,
      repo,
      branch,
      userId,
      allowTokenlessProvider = false,
    } = command;

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
        organizationId: organization.id,
        userId,
      });
      throw new GitProviderNotFoundError(gitProviderId);
    }

    // Business rule: git provider must belong to the same organization
    if (gitProvider.organizationId !== organization.id) {
      this.logger.error('Git provider does not belong to organization', {
        gitProviderId,
        providerOrganizationId: gitProvider.organizationId,
        requestedOrganizationId: organization.id,
        userId,
      });
      throw new GitProviderOrganizationMismatchError(
        gitProviderId,
        organization.id,
      );
    }

    // Business rule: git provider must have a token configured (unless explicitly allowed)
    if (!gitProvider.token && !allowTokenlessProvider) {
      this.logger.error('Git provider has no token configured', {
        gitProviderId,
        organizationId: organization.id,
        userId,
      });
      throw new GitProviderMissingTokenError(gitProviderId);
    }

    // Business rule: check for duplicate repositories (same owner/repo/branch combination in same organization)
    const existingRepo =
      await this.gitRepoService.findGitRepoByOwnerRepoAndBranchInOrganization(
        owner,
        repo,
        branch,
        organization.id,
      );

    if (existingRepo) {
      this.logger.error('Repository already exists in organization', {
        owner,
        repo,
        branch,
        organizationId: organization.id,
        gitProviderId,
        userId,
        existingRepoId: existingRepo.id,
      });
      throw new GitRepoAlreadyExistsError(owner, repo, branch, organization.id);
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
      organizationId: organization.id,
      name: 'Default',
      path: '/',
      gitRepoId: createdRepo.id,
    });

    return createdRepo;
  }
}
