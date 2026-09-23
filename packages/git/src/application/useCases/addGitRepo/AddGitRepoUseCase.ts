import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  AddGitRepoCommand,
  AddGitRepoResponse,
  createUserId,
  GitProviderMissingTokenError,
  GitProviderOrganizationMismatchError,
  GitRepoAlreadyExistsError,
  IAccountsPort,
  IAddGitRepoUseCase,
  IDeploymentPort,
  MissingGitInputError,
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
      throw new MissingGitInputError('Git provider ID');
    }

    if (!owner) {
      throw new MissingGitInputError('Repository owner');
    }

    if (!repo) {
      throw new MissingGitInputError('Repository name');
    }

    if (!branch) {
      throw new MissingGitInputError('Branch name');
    }

    const gitProvider =
      await this.gitProviderService.findGitProviderById(gitProviderId);

    // A provider that does not exist and one owned by another organization are
    // the same answer by design, so they are the same branch.
    if (!gitProvider || gitProvider.organizationId !== organization.id) {
      this.logger.error('Git provider not found in organization', {
        gitProviderId,
        providerOrganizationId: gitProvider?.organizationId ?? null,
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
