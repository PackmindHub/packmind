import { MarketplaceReconciliationDelayedJob } from './MarketplaceReconciliationDelayedJob';
import { PublishArtifactsDelayedJob } from './PublishArtifactsDelayedJob';
import { PublishPluginToMarketplaceDelayedJob } from './PublishPluginToMarketplaceDelayedJob';
import { RemovePluginFromMarketplaceDelayedJob } from './RemovePluginFromMarketplaceDelayedJob';

export interface IDeploymentsDelayedJobs {
  publishArtifactsDelayedJob: PublishArtifactsDelayedJob;
  marketplaceReconciliationDelayedJob: MarketplaceReconciliationDelayedJob;
  publishPluginToMarketplaceDelayedJob: PublishPluginToMarketplaceDelayedJob;
  removePluginFromMarketplaceDelayedJob: RemovePluginFromMarketplaceDelayedJob;
}
