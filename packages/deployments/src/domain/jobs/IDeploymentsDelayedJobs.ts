import { MarketplaceReconciliationDelayedJob } from '../../application/jobs/MarketplaceReconciliationDelayedJob';
import { PublishArtifactsDelayedJob } from '../../application/jobs/PublishArtifactsDelayedJob';

export interface IDeploymentsDelayedJobs {
  publishArtifactsDelayedJob: PublishArtifactsDelayedJob;
  marketplaceReconciliationDelayedJob: MarketplaceReconciliationDelayedJob;
}
