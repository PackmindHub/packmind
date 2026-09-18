import { UserId } from '../../accounts';
import { UserEvent } from '../../events';
import { GitRepoId } from '../../git';
import { MarketplaceId } from '../MarketplaceId';

/** `addedBy` is the value denormalized onto `Marketplace.addedBy`. */
export interface MarketplaceLinkedPayload {
  marketplaceId: MarketplaceId;
  gitRepoId: GitRepoId;
  addedBy: UserId;
}

export class MarketplaceLinkedEvent extends UserEvent<MarketplaceLinkedPayload> {
  static override readonly eventName = 'deployments.marketplace.linked';
}
