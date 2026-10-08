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
import {
  extractBaseUrl,
  gitHostOf,
  ownerReadingsOf,
  parseGitProviderVendor,
  sameGitHost,
} from '@packmind/node-utils';
import { isProbeableSource } from '../shared/probeCandidateCredentials';
import { providerHostUrl } from '../../services/providerHostUrl';

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
    // The remote is the server's own evidence; the vendor a CLI sends is only
    // trusted from CLIs that predate sending the remote.
    const providerVendor: GitProviderVendor = gitRemoteUrl
      ? parseGitProviderVendor(gitRemoteUrl)
      : ((command.providerVendor as GitProviderVendor | undefined) ??
        'unknown');

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
    // A provider's URL states which instance it reaches, so a self-hosted
    // remote finds the provider an admin configured for it, whatever vendor a
    // substring of the remote suggests.
    const hostProviders = providersResponse.providers.filter((p) =>
      gitRemoteUrl
        ? sameGitHost(providerHostUrl(p), gitRemoteUrl)
        : p.source === providerVendor,
    );
    const tokenProviders = hostProviders.filter(
      (p) => p.hasAuth && isProbeableSource(p.source),
    );

    // Every provider is probed before anything is created: creating on the
    // first match would raise a duplicate-repo error when a later provider
    // already hosts the repo.
    type ProviderInfo = (typeof tokenProviders)[number];
    const providersWithAccess: { provider: ProviderInfo; owner: string }[] = [];

    for (const provider of tokenProviders) {
      // A provider installed under a path prefix names the group without it.
      const owners = ownerReadingsOf(owner, provider.url, gitRemoteUrl).map(
        (reading) => reading.toLowerCase(),
      );
      const existingRepos = await this.gitPort.listRepos(provider.id);
      const existingRepo = owners
        .map((reading) =>
          existingRepos.find(
            (r) =>
              r.owner.toLowerCase() === reading &&
              r.repo.toLowerCase() === repo.toLowerCase() &&
              r.branch === branch,
          ),
        )
        .find(Boolean);

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
        const accessibleRepo = owners
          .map((reading) =>
            availableRepos.repositories.find(
              (r) =>
                r.owner.toLowerCase() === reading &&
                r.name.toLowerCase() === repo.toLowerCase(),
            ),
          )
          .find(Boolean);

        if (accessibleRepo) {
          providersWithAccess.push({ provider, owner: accessibleRepo.owner });
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
      const { provider, owner: providerOwner } = providersWithAccess[0];
      this.logger.info('Token can access repo, creating under token provider', {
        providerId: provider.id,
      });
      return this.gitPort.addGitRepo({
        userId,
        organizationId,
        gitProviderId: provider.id,
        owner: providerOwner,
        repo,
        branch,
      });
    }

    if (tokenProviders.length > 0) {
      this.logger.warn(
        'No authenticated provider of the host can reach the repository, falling back to a CLI-managed provider',
        {
          organizationId,
          gitProviderIds: tokenProviders.map((p) => p.id),
        },
      );
    } else {
      this.logger.info(
        'No token provider has access, falling back to tokenless',
      );
    }

    let expectedProviderUrl: string;
    if (providerVendor === 'github') {
      expectedProviderUrl = 'https://github.com';
    } else if (providerVendor === 'gitlab') {
      expectedProviderUrl = 'https://gitlab.com';
    } else if (gitRemoteUrl && gitHostOf(gitRemoteUrl)) {
      // Without a host, no provider could ever match the remote again, and a
      // new one would be created on every call.
      expectedProviderUrl = extractBaseUrl(gitRemoteUrl);
    } else {
      throw new UnresolvableGitProviderError(owner, repo);
    }

    // Older servers stored a whole ssh:// remote as the URL, so the host is
    // what matches; an exact URL still wins when several providers qualify.
    const tokenlessProviders = hostProviders.filter(
      (p) => !p.hasAuth && sameGitHost(p.url, expectedProviderUrl),
    );

    // Older servers kept one provider per ssh:// remote, so the repository
    // may sit under any CLI-managed provider of the host.
    for (const provider of tokenlessProviders) {
      const tokenlessRepos = await this.gitPort.listRepos(provider.id);
      const existingTokenlessRepo = tokenlessRepos.find(
        (r) =>
          r.owner.toLowerCase() === owner.toLowerCase() &&
          r.repo.toLowerCase() === repo.toLowerCase() &&
          r.branch === branch,
      );

      if (existingTokenlessRepo) {
        this.logger.info('Found existing repo under tokenless provider', {
          providerId: provider.id,
          repoId: existingTokenlessRepo.id,
        });
        return existingTokenlessRepo;
      }
    }

    let tokenlessProvider =
      tokenlessProviders.find(
        (p) => p.url?.toLowerCase() === expectedProviderUrl.toLowerCase(),
      ) ?? tokenlessProviders[0];

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
