import { UserEvent } from '../../events';
import { GitRepoId } from '../../git/GitRepoId';

export interface DistributionRecordedPayload {
  repositoryId: GitRepoId;
  branch: string;
}

export class DistributionRecordedEvent extends UserEvent<DistributionRecordedPayload> {
  static override readonly eventName = 'deployments.distribution.recorded';
}
