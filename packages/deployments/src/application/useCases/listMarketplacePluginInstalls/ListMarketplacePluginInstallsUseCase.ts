import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  IAccountsPort,
  IListMarketplacePluginInstallsUseCase,
  ListMarketplacePluginInstallsCommand,
  ListMarketplacePluginInstallsResponse,
  MarketplaceNotFoundError,
  PluginInstallationListItem,
  UserId,
} from '@packmind/types';
import {
  IMarketplaceRepository,
  IPluginInstallationRepository,
} from '../../../domain/repositories';

const origin = 'ListMarketplacePluginInstallsUseCase';

/**
 * Lists all tracked plugin installations for a marketplace.
 *
 * Open to any org member (read-only). Verifies the marketplace belongs to the
 * caller's organization before returning data (IDOR guard — spec §7.4, §10).
 * Enriches each row with a display name when the installation is attributed to
 * a verified user.
 *
 * The frontend groups and counts client-side — no server-side aggregation.
 */
export class ListMarketplacePluginInstallsUseCase
  extends AbstractMemberUseCase<
    ListMarketplacePluginInstallsCommand,
    ListMarketplacePluginInstallsResponse
  >
  implements IListMarketplacePluginInstallsUseCase
{
  constructor(
    private readonly pluginInstallationRepository: IPluginInstallationRepository,
    private readonly marketplaceRepository: IMarketplaceRepository,
    accountsPort: IAccountsPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  protected async executeForMembers(
    command: ListMarketplacePluginInstallsCommand & MemberContext,
  ): Promise<ListMarketplacePluginInstallsResponse> {
    const { marketplaceId, organization } = command;

    // Verify the marketplace belongs to the caller's organization (spec §7.4, §10).
    // Mirrors the pattern used in ListMarketplaceDistributionsUseCase.
    const marketplace =
      await this.marketplaceRepository.findByOrganizationAndId(
        organization.id,
        marketplaceId,
      );
    if (!marketplace) {
      this.logger.warn('Marketplace not found for listPluginInstalls', {
        marketplaceId,
        organizationId: organization.id,
      });
      throw new MarketplaceNotFoundError(marketplaceId);
    }

    const installations =
      await this.pluginInstallationRepository.listByMarketplace(marketplaceId);

    if (installations.length === 0) {
      return [];
    }

    // De-duplicate user lookups
    const uniqueUserIds = Array.from(
      new Set<UserId>(
        installations
          .map((i) => i.userId)
          .filter((uid): uid is UserId => uid !== null),
      ),
    );

    const displayNameByUserId = new Map<string, string>();
    await Promise.all(
      uniqueUserIds.map(async (uid) => {
        const user = await this.accountsPort.getUserById(uid);
        if (user) {
          displayNameByUserId.set(uid, user.displayName ?? user.email);
        }
      }),
    );

    const items: PluginInstallationListItem[] = installations.map(
      (installation) => ({
        ...installation,
        userDisplayName: installation.userId
          ? (displayNameByUserId.get(installation.userId as string) ?? null)
          : null,
      }),
    );

    return items;
  }
}
