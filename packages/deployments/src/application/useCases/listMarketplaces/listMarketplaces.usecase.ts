import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  IAccountsPort,
  IListMarketplacesUseCase,
  ListMarketplacesCommand,
  ListMarketplacesResponse,
  MarketplaceListItem,
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
 *  3. Return the presentation DTOs — `pluginCount` is already denormalized
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
    accountsPort: IAccountsPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  protected async executeForMembers(
    command: ListMarketplacesCommand & MemberContext,
  ): Promise<ListMarketplacesResponse> {
    const { organization } = command;

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

    const items: MarketplaceListItem[] = marketplaces.map((marketplace) => ({
      ...marketplace,
      addedByUserName: userNameByUserId.get(marketplace.addedBy) ?? '',
    }));

    return items;
  }
}
