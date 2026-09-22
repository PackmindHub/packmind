import { DeploymentsError } from './DeploymentsError';

/**
 * The root target of a repository cannot be deleted.
 *
 * `conflict` rather than `forbidden`: the request is well-formed and the
 * caller's rights are not the subject — it is the target's own role that
 * rules the deletion out, and no change of permissions would allow it.
 */
export class RootTargetNotDeletableError extends DeploymentsError {
  constructor(targetId: string) {
    super(
      'conflict',
      'root_target_not_deletable',
      { targetId },
      'Root target cannot be deleted',
    );
    this.name = 'RootTargetNotDeletableError';
  }
}
