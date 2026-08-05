import { GitRepoId } from './GitRepoId';
import { GitProviderId } from './GitProvider';
import { GitRepoType } from './GitRepoType';

export type GitRepo = {
  id: GitRepoId;
  owner: string;
  repo: string;
  branch: string;
  providerId: GitProviderId;
  type: GitRepoType;
  isTracked: boolean;
  /**
   * When an organization admin removed Packmind's tracking of this repository.
   * `null` means tracking was never removed, or has since been restored.
   *
   * Deliberately not the `deleted_at` soft-delete column: repository resolution
   * skips soft-deleted rows, so carrying the state there would make re-tracking
   * create a duplicate row and orphan the distribution history.
   */
  trackingRemovedAt: Date | null;
};
