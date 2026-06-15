import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  DistributionStatus,
  IAccountsPort,
  IListMarketplaceDistributionsUseCase,
  ISpacesPort,
  ListMarketplaceDistributionsCommand,
  ListMarketplaceDistributionsResponse,
  MarketplaceDistributionListItem,
  MarketplaceNotFoundError,
  PackageId,
  SpaceColor,
  SpaceId,
  UserId,
} from '@packmind/types';
import { IMarketplaceDistributionRepository } from '../../../domain/repositories/IMarketplaceDistributionRepository';
import { IMarketplaceRepository } from '../../../domain/repositories/IMarketplaceRepository';
import { PackageService } from '../../services/PackageService';

const origin = 'ListMarketplaceDistributionsUseCase';

/**
 * Lists every marketplace plugin distribution for a marketplace owned by the
 * caller's organization, enriched with the Packmind package name and the
 * display name of the author who originally published the plugin.
 *
 * Open to any organization member — admin permissions are not required for
 * reads (admin-only mutations live in `MarkPluginForRemovalUseCase` /
 * `CancelPluginRemovalUseCase`).
 *
 * Flow:
 *  1. Validate the marketplace belongs to the caller's organization.
 *     Miss → `MarketplaceNotFoundError`.
 *  2. Load every (non-soft-deleted) distribution targeting the marketplace,
 *     excluding terminal `removed` rows — once a plugin's deletion has landed
 *     in the repo it is no longer "on" the marketplace, so it drops out of the
 *     list.
 *  3. Collapse to one row per `packageId`, keeping only the latest distribution
 *     (the repository returns rows ordered by `createdAt DESC`, so the first
 *     occurrence of each `packageId` wins). Previous attempts — failures
 *     superseded by a later success, or any earlier publish — are dropped.
 *  4. Hydrate `packageName` per row via `PackageService.findById`. Calls are
 *     de-duplicated per `packageId`. Each loaded package also yields the
 *     `spaceId` used to resolve the owning Space (step 6).
 *  5. Hydrate `authorName` per row via `IAccountsPort.getUserById`. Calls are
 *     de-duplicated per `authorId`.
 *  6. Hydrate the owning `space` (`id`, `name`, `color`) per row via
 *     `ISpacesPort.getSpaceById`. Calls are de-duplicated per `spaceId`. Rows
 *     whose source package has been hard-deleted (or whose space has) carry a
 *     `null` space so the UI can either fall back gracefully or hide the chip.
 */
export class ListMarketplaceDistributionsUseCase
  extends AbstractMemberUseCase<
    ListMarketplaceDistributionsCommand,
    ListMarketplaceDistributionsResponse
  >
  implements IListMarketplaceDistributionsUseCase
{
  constructor(
    private readonly marketplaceRepository: IMarketplaceRepository,
    private readonly marketplaceDistributionRepository: IMarketplaceDistributionRepository,
    private readonly packageService: PackageService,
    private readonly spacesPort: ISpacesPort,
    accountsPort: IAccountsPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  protected async executeForMembers(
    command: ListMarketplaceDistributionsCommand & MemberContext,
  ): Promise<ListMarketplaceDistributionsResponse> {
    const { marketplaceId, organization } = command;

    const marketplace =
      await this.marketplaceRepository.findByOrganizationAndId(
        organization.id,
        marketplaceId,
      );
    if (!marketplace) {
      this.logger.warn('Marketplace not found for listDistributions', {
        marketplaceId,
        organizationId: organization.id,
      });
      throw new MarketplaceNotFoundError(marketplaceId);
    }

    // Exclude terminal `removed` rows: a plugin whose deletion has landed in
    // the repo is no longer part of the marketplace and must not appear in the
    // list (it lingers as `to_be_removed` only until reconciliation confirms
    // the merge).
    const rawDistributions = (
      await this.marketplaceDistributionRepository.findByMarketplaceId(
        marketplaceId,
      )
    ).filter(
      (distribution) => distribution.status !== DistributionStatus.removed,
    );

    // One row per package — only the latest distribution is meaningful. The
    // repository returns rows ordered by `createdAt DESC`, so the first
    // occurrence of each `packageId` is the most recent attempt and we drop
    // every prior one (superseded failures, earlier publishes, etc.).
    const seenPackageIds = new Set<PackageId>();
    const distributions = rawDistributions.filter((distribution) => {
      if (seenPackageIds.has(distribution.packageId)) {
        return false;
      }
      seenPackageIds.add(distribution.packageId);
      return true;
    });

    if (distributions.length === 0) {
      return [];
    }

    const uniquePackageIds = Array.from(
      new Set<PackageId>(distributions.map((d) => d.packageId)),
    );
    const packageNameById = new Map<PackageId, string>();
    const packageSpaceIdById = new Map<PackageId, SpaceId>();
    await Promise.all(
      uniquePackageIds.map(async (pid) => {
        const pkg = await this.packageService.findById(pid);
        if (pkg) {
          packageNameById.set(pid, pkg.name);
          packageSpaceIdById.set(pid, pkg.spaceId);
        }
      }),
    );

    const uniqueAuthorIds = Array.from(
      new Set<UserId>(distributions.map((d) => d.authorId)),
    );
    const authorNameById = new Map<UserId, string>();
    await Promise.all(
      uniqueAuthorIds.map(async (uid) => {
        const user = await this.accountsPort.getUserById(uid);
        if (user) {
          authorNameById.set(uid, user.displayName ?? user.email);
        }
      }),
    );

    const uniqueSpaceIds = Array.from(
      new Set<SpaceId>(packageSpaceIdById.values()),
    );
    const spaceById = new Map<
      SpaceId,
      { id: SpaceId; name: string; color: SpaceColor }
    >();
    await Promise.all(
      uniqueSpaceIds.map(async (sid) => {
        const space = await this.spacesPort.getSpaceById(sid);
        if (space) {
          spaceById.set(sid, {
            id: space.id,
            name: space.name,
            color: space.color,
          });
        }
      }),
    );

    const items: MarketplaceDistributionListItem[] = distributions.map(
      (distribution) => {
        const sid = packageSpaceIdById.get(distribution.packageId);
        const space = sid ? (spaceById.get(sid) ?? null) : null;
        return {
          ...distribution,
          packageName: packageNameById.get(distribution.packageId) ?? '',
          authorName: authorNameById.get(distribution.authorId) ?? '',
          space,
        };
      },
    );

    return items;
  }
}
