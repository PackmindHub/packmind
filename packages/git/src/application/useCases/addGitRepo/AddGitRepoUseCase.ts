import { PackmindLogger } from '@packmind/logger';
import {
  AbstractMemberUseCase,
  MemberContext,
  providerPathPrefix,
  sameGitHost,
} from '@packmind/node-utils';
import {
  AddGitRepoCommand,
  AddGitRepoResponse,
  createUserId,
  GitProvider,
  GitProviderMissingTokenError,
  GitProviderOrganizationMismatchError,
  GitRepo,
  GitRepoAlreadyExistsError,
  IAccountsPort,
  IAddGitRepoUseCase,
  IDeploymentPort,
  MissingGitInputError,
  OrganizationId,
  providerHasAuth,
} from '@packmind/types';
import { GitProviderService } from '../../GitProviderService';
import { GitRepoService } from '../../GitRepoService';
import { providerHostUrl } from '../../services/providerHostUrl';

const origin = 'AddGitRepoUseCase';

/**
 * A repository the CLI recorded before the organization connected an
 * authenticated provider for the same host moves under it, rather than
 * blocking it as a duplicate. The host decides, not the source: the CLI
 * records a self-hosted instance under an `unknown` provider.
 */
function isAdoptableBy(
  holdingProvider: GitProvider,
  gitProvider: GitProvider,
): boolean {
  return (
    holdingProvider.id !== gitProvider.id &&
    !providerHasAuth(holdingProvider) &&
    providerHasAuth(gitProvider) &&
    sameGitHost(providerHostUrl(gitProvider), providerHostUrl(holdingProvider))
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
      (await this.gitRepoService.findGitRepoByOwnerRepoAndBranchInOrganization(
        owner,
        repo,
        branch,
        organization.id,
      )) ??
      (await this.findRecordedUnderPathPrefix(
        gitProvider,
        owner,
        repo,
        branch,
        organization.id,
      ));

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
        const adoptedRepo = await this.gitRepoService.adoptGitRepo(
          existingRepo,
          gitProvider.id,
          organization.id,
          owner,
        );
        // An emptied CLI-managed provider would stay listed beside the
        // connection that now holds its repositories.
        await this.gitProviderService.deleteGitProviderIfEmpty(
          holdingProvider.id,
          createUserId(userId),
        );
        if (adoptedRepo.isTracked) {
          try {
            await this.deploymentsAdapter.syncDistributionsFromLockFiles({
              userId: createUserId(userId),
              organizationId: organization.id,
              gitRepoId: adoptedRepo.id,
            });
          } catch (error) {
            this.logger.warn(
              'Could not sync distribution state from lock files',
              {
                gitRepoId: adoptedRepo.id,
                error: error instanceof Error ? error.message : String(error),
              },
            );
          }
        }
        return adoptedRepo;
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

  // The CLI recorded a remote of an instance installed under a path prefix
  // with that prefix before the group, which the provider does not report. On
  // another host the prefixed owner is a group of its own.
  private async findRecordedUnderPathPrefix(
    gitProvider: GitProvider,
    owner: string,
    repo: string,
    branch: string,
    organizationId: OrganizationId,
  ): Promise<GitRepo | null> {
    const pathPrefix = providerPathPrefix(gitProvider.url);
    if (!pathPrefix) {
      return null;
    }
    const gitRepo =
      await this.gitRepoService.findGitRepoByOwnerRepoAndBranchInOrganization(
        `${pathPrefix}/${owner}`,
        repo,
        branch,
        organizationId,
      );
    if (!gitRepo) {
      return null;
    }
    const holdingProvider = await this.gitProviderService.findGitProviderById(
      gitRepo.providerId,
    );
    return holdingProvider &&
      sameGitHost(
        providerHostUrl(holdingProvider),
        providerHostUrl(gitProvider),
      )
      ? gitRepo
      : null;
  }
}
