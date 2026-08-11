import { UserId } from '../../accounts';
import { UserEvent } from '../../events';
import { GitRepoId } from '../../git';
import { MarketplaceId } from '../MarketplaceId';

/**
 * Payload emitted when an organization admin successfully links a marketplace.
 *
 * `userId` and `organizationId` are automatically merged in via the
 * `UserEvent` base. `addedBy` captures the admin who performed the action and
 * is denormalized onto the `Marketplace` row (it may diverge from `userId` in
 * the future, e.g. for impersonation/audit replays).
 */
export interface MarketplaceLinkedPayload {
  marketplaceId: MarketplaceId;
  gitRepoId: GitRepoId;
  addedBy: UserId;
}

export class MarketplaceLinkedEvent extends UserEvent<MarketplaceLinkedPayload> {
  static override readonly eventName = 'deployments.marketplace.linked';
}
