import { MarketplaceReconciliationDelayedJob } from '../../application/jobs/MarketplaceReconciliationDelayedJob';
import { PublishArtifactsDelayedJob } from '../../application/jobs/PublishArtifactsDelayedJob';
import { PublishPluginToMarketplaceDelayedJob } from '../../application/jobs/PublishPluginToMarketplaceDelayedJob';
import { RemovePluginFromMarketplaceDelayedJob } from '../../application/jobs/RemovePluginFromMarketplaceDelayedJob';

export interface IDeploymentsDelayedJobs {
  publishArtifactsDelayedJob: PublishArtifactsDelayedJob;
  marketplaceReconciliationDelayedJob: MarketplaceReconciliationDelayedJob;
  publishPluginToMarketplaceDelayedJob: PublishPluginToMarketplaceDelayedJob;
  removePluginFromMarketplaceDelayedJob: RemovePluginFromMarketplaceDelayedJob;
}
