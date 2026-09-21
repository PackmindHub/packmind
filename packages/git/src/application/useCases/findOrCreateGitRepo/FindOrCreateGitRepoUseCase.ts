import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  FindOrCreateGitRepoCommand,
  FindOrCreateGitRepoResponse,
  GitProviderVendors,
  GitProviderVendor,
  GitRepo,
  IAccountsPort,
  IFindOrCreateGitRepoUseCase,
  IGitPort,
  UnresolvableGitProviderError,
} from '@packmind/types';
import { extractBaseUrl, parseGitProviderVendor } from '@packmind/node-utils';

const origin = 'FindOrCreateGitRepoUseCase';

/**
 * Finds the git repository for an owner/repo/branch within an organization, or
 * creates it — auto-creating a tokenless provider when no token provider can
 * host it. Shared with the deployments domain, whose TargetResolutionService
 * delegates its provider/repo resolution here.
 */
export class FindOrCreateGitRepoUseCase
  extends AbstractMemberUseCase<
    FindOrCreateGitRepoCommand,
    FindOrCreateGitRepoResponse
  >
  implements IFindOrCreateGitRepoUseCase
{
  constructor(
    private readonly gitPort: IGitPort,
    accountsAdapter: IAccountsPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsAdapter, logger);
  }

  protected async executeForMembers(
    command: FindOrCreateGitRepoCommand & MemberContext,
  ): Promise<FindOrCreateGitRepoResponse> {
    const { owner, repo, branch, organization, userId } = command;

    const gitRemoteUrl = command.gitRemoteUrl;
    const providerVendor: GitProviderVendor =
      command.providerVendor !== undefined
        ? (command.providerVendor as GitProviderVendor)
        : gitRemoteUrl
          ? parseGitProviderVendor(gitRemoteUrl)
          : 'unknown';

    const organizationId = organization.id;

    this.logger.info('Finding or creating git repo', {
      providerVendor,
      owner,
      repo,
      branch,
    });

    const providersResponse = await this.gitPort.listProviders({
      userId,
      organizationId,
    });

    const vendorProviders = providersResponse.providers.filter(
      (p) => p.source === providerVendor,
    );

    // Unknown vendors expose no API to list repositories, so there is nothing
    // to probe a token against.
    if (providerVendor !== 'unknown') {
      const tokenProviders = vendorProviders.filter((p) => p.hasAuth);

      // Every provider is probed before anything is created: creating on the
      // first match would raise a duplicate-repo error when a later provider
      // already hosts the repo.
      type ProviderInfo = (typeof tokenProviders)[number];
      const providersWithAccess: ProviderInfo[] = [];

      for (const provider of tokenProviders) {
        const existingRepos = await this.gitPort.listRepos(provider.id);
        const existingRepo = existingRepos.find(
          (r) =>
            r.owner.toLowerCase() === owner.toLowerCase() &&
            r.repo.toLowerCase() === repo.toLowerCase() &&
            r.branch === branch,
        );

        if (existingRepo) {
          this.logger.info('Found existing repo under token provider', {
            providerId: provider.id,
            repoId: existingRepo.id,
          });
          return existingRepo;
        }

        try {
          const availableRepos = await this.gitPort.listAvailableRepos({
            gitProviderId: provider.id,
            userId,
            organizationId,
          });
          const canAccess = availableRepos.repositories.some(
            (r) =>
              r.owner.toLowerCase() === owner.toLowerCase() &&
              r.name.toLowerCase() === repo.toLowerCase(),
          );

          if (canAccess) {
            providersWithAccess.push(provider);
          }
        } catch (error) {
          this.logger.info('Failed to list available repos for provider', {
            providerId: provider.id,
            error: error instanceof Error ? error.message : String(error),
          });
          // Swallowed: this provider's token may be expired or revoked, which
          // only rules out this provider.
        }
      }

      if (providersWithAccess.length > 0) {
        const provider = providersWithAccess[0];
        this.logger.info(
          'Token can access repo, creating under token provider',
          { providerId: provider.id },
        );
        return this.gitPort.addGitRepo({
          userId,
          organizationId,
          gitProviderId: provider.id,
          owner,
          repo,
          branch,
        });
      }
    }

    this.logger.info('No token provider has access, falling back to tokenless');

    let expectedProviderUrl: string;
    if (providerVendor === 'github') {
      expectedProviderUrl = 'https://github.com';
    } else if (providerVendor === 'gitlab') {
      expectedProviderUrl = 'https://gitlab.com';
    } else if (gitRemoteUrl) {
      expectedProviderUrl = extractBaseUrl(gitRemoteUrl);
    } else {
      throw new UnresolvableGitProviderError(owner, repo);
    }

    let tokenlessProvider = vendorProviders.find(
      (p) =>
        !p.hasAuth &&
        p.url?.toLowerCase() === expectedProviderUrl.toLowerCase(),
    );

    if (!tokenlessProvider) {
      const newProvider = await this.gitPort.addGitProvider({
        userId,
        organizationId,
        gitProvider: {
          source: GitProviderVendors[providerVendor],
          url: expectedProviderUrl,
          token: null,
          authMethod: 'token' as const,
          displayName: '',
        },
        allowTokenlessProvider: true,
      });
      this.logger.info('Created tokenless provider', {
        providerId: newProvider.id,
      });
      tokenlessProvider = {
        ...newProvider,
        hasAuth: false,
        lastDistributionAt: null,
      };
    }

    const tokenlessRepos = await this.gitPort.listRepos(tokenlessProvider.id);
    const existingTokenlessRepo = tokenlessRepos.find(
      (r) =>
        r.owner.toLowerCase() === owner.toLowerCase() &&
        r.repo.toLowerCase() === repo.toLowerCase() &&
        r.branch === branch,
    );

    if (existingTokenlessRepo) {
      this.logger.info('Found existing repo under tokenless provider', {
        providerId: tokenlessProvider.id,
        repoId: existingTokenlessRepo.id,
      });
      return existingTokenlessRepo;
    }

    this.logger.info('Creating repo under tokenless provider', {
      providerId: tokenlessProvider.id,
    });
    const newRepo: GitRepo = await this.gitPort.addGitRepo({
      userId,
      organizationId,
      gitProviderId: tokenlessProvider.id,
      owner,
      repo,
      branch,
      allowTokenlessProvider: true,
    });
    return newRepo;
  }
}
