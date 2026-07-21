import { OrganizationId } from '../../accounts/Organization';
import { UserEvent } from '../../events';
import { GitRepoId } from '../GitRepoId';

export interface RepositoryTrackingSetPayload {
  organizationId: OrganizationId;
  repositoryId: GitRepoId;
  owner: string;
  repo: string;
  branch: string;
  origin: 'init' | 'track';
  fromBranch?: string;
}

export class RepositoryTrackingSetEvent extends UserEvent<RepositoryTrackingSetPayload> {
  static override readonly eventName = 'git.repository.tracking-set';
}
