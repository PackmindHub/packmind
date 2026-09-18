import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  AddGitRepoCommand,
  AddGitRepoResponse,
  createUserId,
  GitProviderMissingTokenError,
  GitProviderNotFoundError,
  GitProviderOrganizationMismatchError,
  GitRepoAlreadyExistsError,
  IAccountsPort,
  IAddGitRepoUseCase,
  IDeploymentPort,
} from '@packmind/types';
import { GitProviderService } from '../../GitProviderService';
import { GitRepoService } from '../../GitRepoService';

const origin = 'AddGitRepoUseCase';

export class AddGitRepoUseCase
  extends AbstractMemberUseCase<AddGitRepoCommand, AddGitRepoResponse>
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

  protected async executeForMembers(
    command: AddGitRepoCommand & MemberContext,
  ): Promise<AddGitRepoResponse> {
    const {
      organization,
      gitProviderId,
      owner,
      repo,
      branch,
      userId,
      allowTokenlessProvider = false,
    } = command;

    if (!gitProviderId) {
      throw new Error('Git provider ID is required');
    }

    if (!owner || !repo || !branch) {
      throw new Error('Owner, repository name, and branch are all required');
    }

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

    // App-auth providers carry no token on the row: the installation token is
    // minted on demand by GithubTokenResolverFactory.
    if (
      gitProvider.authMethod !== 'app' &&
      !gitProvider.token &&
      !allowTokenlessProvider
    ) {
      this.logger.error('Git provider has no token configured', {
        gitProviderId,
        organizationId: organization.id,
        userId,
      });
      throw new GitProviderMissingTokenError(gitProviderId);
    }

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

    // The type is explicit so this use case can never create a
    // marketplace-typed row.
    const gitRepoWithProvider = {
      owner,
      repo,
      branch,
      providerId: gitProviderId,
      type: 'standard' as const,
      isTracked: false,
      trackingRemovedAt: null,
    };

    const createdRepo =
      await this.gitRepoService.addGitRepo(gitRepoWithProvider);

    await this.deploymentsAdapter.addTarget({
      userId: createUserId(userId),
      organizationId: organization.id,
      name: 'Default',
      path: '/',
      gitRepoId: createdRepo.id,
      allowTokenlessProvider,
    });

    return createdRepo;
  }
}
