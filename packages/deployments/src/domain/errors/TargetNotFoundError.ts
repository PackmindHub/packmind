import { DeploymentsError } from '@packmind/types';

/**
 * The target does not exist, or it is not reachable from the organization it
 * was addressed through.
 *
 * One error for both, so a 403 never confirms that a target id is real.
 */
export class TargetNotFoundError extends DeploymentsError {
  constructor(targetId: string) {
    super(
      'not_found',
      'target_not_found',
      { targetId },
      `Target with id "${targetId}" was not found`,
    );
    this.name = 'TargetNotFoundError';
  }
}
