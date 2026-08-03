import { UserEvent } from '../../events';
import { GitRepoId } from '../../git';
import { MarketplaceId } from '../MarketplaceId';

/**
 * Payload emitted when an organization admin successfully unlinks a
 * marketplace. `userId` and `organizationId` are automatically merged in via
 * the `UserEvent` base.
 */
export interface MarketplaceUnlinkedPayload {
  marketplaceId: MarketplaceId;
  gitRepoId: GitRepoId;
}

export class MarketplaceUnlinkedEvent extends UserEvent<MarketplaceUnlinkedPayload> {
  static override readonly eventName = 'deployments.marketplace.unlinked';
}
