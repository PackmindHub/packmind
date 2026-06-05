import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  DistributionStatus,
  IAccountsPort,
  IListMarketplaceDistributionsUseCase,
  ListMarketplaceDistributionsCommand,
  ListMarketplaceDistributionsResponse,
  MarketplaceDistributionListItem,
  MarketplaceNotFoundError,
  PackageId,
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
 *  3. Hydrate `packageName` per row via `PackageService.findById`. Calls are
 *     de-duplicated per `packageId`.
 *  4. Hydrate `authorName` per row via `IAccountsPort.getUserById`. Calls are
 *     de-duplicated per `authorId`.
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
    const distributions = (
      await this.marketplaceDistributionRepository.findByMarketplaceId(
        marketplaceId,
      )
    ).filter(
      (distribution) => distribution.status !== DistributionStatus.removed,
    );
    if (distributions.length === 0) {
      return [];
    }

    const uniquePackageIds = Array.from(
      new Set<PackageId>(distributions.map((d) => d.packageId)),
    );
    const packageNameById = new Map<PackageId, string>();
    await Promise.all(
      uniquePackageIds.map(async (pid) => {
        const pkg = await this.packageService.findById(pid);
        if (pkg) {
          packageNameById.set(pid, pkg.name);
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

    const items: MarketplaceDistributionListItem[] = distributions.map(
      (distribution) => ({
        ...distribution,
        packageName: packageNameById.get(distribution.packageId) ?? '',
        authorName: authorNameById.get(distribution.authorId) ?? '',
      }),
    );

    return items;
  }
}
