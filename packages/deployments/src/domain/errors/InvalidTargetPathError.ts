import { DeploymentsError } from './DeploymentsError';

/**
 * The target path is not a directory path we accept, or it tries to climb out
 * of the repository with `..`.
 *
 * One error for both, and one message: telling a caller which of the two
 * rules it broke is the only thing a probe for the traversal check would
 * learn. The path is kept in `context` for the log, where a rejected
 * traversal attempt is worth reading.
 */
export class InvalidTargetPathError extends DeploymentsError {
  constructor(path: string) {
    super(
      'invalid_input',
      'invalid_target_path',
      { path },
      'Invalid path format',
    );
    this.name = 'InvalidTargetPathError';
  }
}
