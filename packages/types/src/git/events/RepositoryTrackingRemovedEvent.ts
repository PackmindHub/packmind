import { OrganizationId } from '../../accounts/Organization';
import { UserEvent } from '../../events';
import { GitRepoId } from '../GitRepoId';

export interface RepositoryTrackingRemovedPayload {
  organizationId: OrganizationId;
  repositoryId: GitRepoId;
  owner: string;
  repo: string;
  /** The branch that was tracked until this removal. */
  branch: string;
}

/**
 * Emitted when an organization admin removes Packmind's tracking of a
 * repository. There is no restored counterpart: re-tracking already emits
 * `RepositoryTrackingSetEvent`, so both ends of a remove/restore pair are on
 * the audit trail.
 */
export class RepositoryTrackingRemovedEvent extends UserEvent<RepositoryTrackingRemovedPayload> {
  static override readonly eventName = 'git.repository.tracking-removed';
}
