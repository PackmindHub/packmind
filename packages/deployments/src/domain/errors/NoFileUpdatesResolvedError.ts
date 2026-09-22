import { DeploymentsInternalError } from './DeploymentsInternalError';

/**
 * The per-target file updates were resolved and came back empty, on a path
 * that had already established there was at least one target to write to.
 *
 * A broken invariant, not an empty result: the map is built a few lines
 * earlier from the same targets, so an empty one means the resolution
 * disagreed with itself.
 */
export class NoFileUpdatesResolvedError extends DeploymentsInternalError {
  constructor(packageId?: string) {
    super(
      'no_file_updates_resolved',
      packageId ? { packageId } : {},
      'No file updates were resolved for any target',
    );
    this.name = 'NoFileUpdatesResolvedError';
  }
}
