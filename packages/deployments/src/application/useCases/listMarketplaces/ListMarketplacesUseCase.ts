import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  GitProviderId,
  GitProviderVendor,
  GitProviderVendors,
  IAccountsPort,
  IGitPort,
  IListMarketplacesUseCase,
  ListMarketplacesCommand,
  ListMarketplacesResponse,
  MarketplaceListItem,
  MarketplaceRepositoryInfo,
  UserId,
} from '@packmind/types';
import { IMarketplaceRepository } from '../../../domain/repositories/IMarketplaceRepository';

const origin = 'ListMarketplacesUseCase';

/**
 * Lists marketplaces linked to the caller's organization. Open to any org
 * member — admins are not required for reads.
 *
 * Flow:
 *  1. Load marketplaces via `IMarketplaceRepository.findByOrganizationId`.
 *  2. Hydrate `addedByUserName` for each row by looking up the linking user.
 *     Calls are de-duplicated per `addedBy` so a marketplace list with many
 *     entries from the same admin makes a single lookup.
 *  3. Resolve each marketplace's backing `GitRepo` and its provider so the
 *     list can show provider info and a link to the repository's web URL.
 *  4. Return the presentation DTOs — `pluginCount` is already denormalized
 *     on the row by the link use case / reconciliation job.
 */
export class ListMarketplacesUseCase
  extends AbstractMemberUseCase<
    ListMarketplacesCommand,
    ListMarketplacesResponse
  >
  implements IListMarketplacesUseCase
{
  constructor(
    private readonly marketplaceRepository: IMarketplaceRepository,
    private readonly gitPort: IGitPort,
    accountsPort: IAccountsPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  protected async executeForMembers(
    command: ListMarketplacesCommand & MemberContext,
  ): Promise<ListMarketplacesResponse> {
    const { organization, userId } = command;

    const marketplaces = await this.marketplaceRepository.findByOrganizationId(
      organization.id,
    );

    if (marketplaces.length === 0) {
      return [];
    }

    // De-duplicate user lookups per addedBy (typical: same admin links most
    // marketplaces for the org).
    const uniqueAddedBy = Array.from(
      new Set<UserId>(marketplaces.map((m) => m.addedBy)),
    );
    const userNameByUserId = new Map<UserId, string>();
    await Promise.all(
      uniqueAddedBy.map(async (uid) => {
        const user = await this.accountsPort.getUserById(uid);
        if (user) {
          userNameByUserId.set(uid, user.displayName ?? user.email);
        }
      }),
    );

    // Resolve provider vendor per providerId once for the whole org so each
    // marketplace can report which provider backs it.
    const providerSourceById = new Map<GitProviderId, GitProviderVendor>();
    const providersResponse = await this.gitPort.listProviders({
      userId,
      organizationId: organization.id,
    });
    for (const provider of providersResponse.providers) {
      providerSourceById.set(provider.id, provider.source);
    }

    // Resolve each marketplace's backing GitRepo (coordinates live on the
    // related row, not on the denormalized marketplace).
    const repositoryByMarketplaceId = new Map<
      string,
      MarketplaceRepositoryInfo | null
    >();
    await Promise.all(
      marketplaces.map(async (marketplace) => {
        const gitRepo = await this.gitPort.findMarketplaceGitRepoById(
          marketplace.gitRepoId,
        );
        if (!gitRepo) {
          repositoryByMarketplaceId.set(marketplace.id, null);
          return;
        }
        const providerSource =
          providerSourceById.get(gitRepo.providerId) ??
          GitProviderVendors.unknown;
        repositoryByMarketplaceId.set(marketplace.id, {
          gitProviderId: gitRepo.providerId,
          owner: gitRepo.owner,
          repo: gitRepo.repo,
          branch: gitRepo.branch,
          providerSource,
          url: buildRepositoryWebUrl(
            providerSource,
            gitRepo.owner,
            gitRepo.repo,
          ),
        });
      }),
    );

    const items: MarketplaceListItem[] = marketplaces.map((marketplace) => ({
      ...marketplace,
      addedByUserName: userNameByUserId.get(marketplace.addedBy) ?? '',
      repository: repositoryByMarketplaceId.get(marketplace.id) ?? null,
    }));

    return items;
  }
}

/**
 * Build the browser-facing repository URL from the provider vendor and the
 * repo coordinates. Mirrors the cloud-host convention used elsewhere in the
 * codebase; returns an empty string for unknown vendors so the UI can suppress
 * the link.
 *
 * GitLab `owner` may itself be a `group/subgroup` path — that is fine, the
 * slashes carry through into a valid URL.
 */
function buildRepositoryWebUrl(
  source: GitProviderVendor,
  owner: string,
  repo: string,
): string {
  switch (source) {
    case GitProviderVendors.github:
      return `https://github.com/${owner}/${repo}`;
    case GitProviderVendors.gitlab:
      return `https://gitlab.com/${owner}/${repo}`;
    default:
      return '';
  }
}
