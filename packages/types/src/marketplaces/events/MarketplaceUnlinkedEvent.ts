import { UserEvent } from '../../events';
import { GitRepoId } from '../../git';
import { MarketplaceId } from '../MarketplaceId';

export interface MarketplaceUnlinkedPayload {
  marketplaceId: MarketplaceId;
  gitRepoId: GitRepoId;
}

export class MarketplaceUnlinkedEvent extends UserEvent<MarketplaceUnlinkedPayload> {
  static override readonly eventName = 'deployments.marketplace.unlinked';
}
