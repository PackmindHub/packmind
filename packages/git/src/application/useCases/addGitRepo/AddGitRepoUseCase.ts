import { PackmindLogger } from '@packmind/logger';
import {
  AbstractMemberUseCase,
  extractBaseUrl,
  MemberContext,
} from '@packmind/node-utils';
import {
  AddGitRepoCommand,
  AddGitRepoResponse,
  createUserId,
  GitProvider,
  GitProviderMissingTokenError,
  GitProviderOrganizationMismatchError,
  GitRepoAlreadyExistsError,
  IAccountsPort,
  IAddGitRepoUseCase,
  IDeploymentPort,
  MissingGitInputError,
  providerHasAuth,
} from '@packmind/types';
import { GitProviderService } from '../../GitProviderService';
import { GitRepoService } from '../../GitRepoService';

const origin = 'AddGitRepoUseCase';

const DEFAULT_HOST_BY_SOURCE: Partial<Record<GitProvider['source'], string>> = {
  github: 'https://github.com',
  gitlab: 'https://gitlab.com',
};

// GitHub providers, App installs included, may store no URL: their API client
// always targets github.com, as GitLab's falls back to gitlab.com.
function hostOf(provider: GitProvider): string | null {
  const url = provider.url
    ? extractBaseUrl(provider.url)
    : DEFAULT_HOST_BY_SOURCE[provider.source];
  return url?.toLowerCase() ?? null;
}

/**
 * A repository the CLI recorded before the organization connected an
 * authenticated provider for the same host moves under it, rather than
 * blocking it as a duplicate.
 */
function isAdoptableBy(
  holdingProvider: GitProvider,
  gitProvider: GitProvider,
): boolean {
  const host = hostOf(gitProvider);
  return (
    holdingProvider.id !== gitProvider.id &&
    !providerHasAuth(holdingProvider) &&
    providerHasAuth(gitProvider) &&
    holdingProvider.source === gitProvider.source &&
    host !== null &&
    hostOf(holdingProvider) === host
  );
}

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
      const holdingProvider =
        existingRepo.providerId === gitProvider.id
          ? gitProvider
          : await this.gitProviderService.findGitProviderById(
              existingRepo.providerId,
            );

      // Adoption keeps the row, hence its id, targets and distribution
      // history; no Default target is added since the repository has one.
      if (holdingProvider && isAdoptableBy(holdingProvider, gitProvider)) {
        this.logger.info('Adopting repository from CLI-managed provider', {
          organizationId: organization.id,
          gitRepoId: existingRepo.id,
          fromGitProviderId: holdingProvider.id,
          toGitProviderId: gitProvider.id,
        });
        return this.gitRepoService.reassignProvider(
          existingRepo.id,
          gitProvider.id,
        );
      }

      this.logger.error('Repository already exists in organization', {
        owner,
        repo,
        branch,
        organizationId: organization.id,
        gitProviderId,
        userId,
        existingRepoId: existingRepo.id,
      });
      throw new GitRepoAlreadyExistsError(
        owner,
        repo,
        branch,
        organization.id,
        holdingProvider
          ? {
              gitProviderId: holdingProvider.id,
              cliManaged: !providerHasAuth(holdingProvider),
            }
          : undefined,
      );
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
