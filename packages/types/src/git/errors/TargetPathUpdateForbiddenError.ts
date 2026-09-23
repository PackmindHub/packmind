import { GitError } from './GitError';

export class TargetPathUpdateForbiddenError extends GitError {
  constructor(public readonly targetId: string) {
    super(
      'invalid_input',
      'target_path_update_requires_token',
      { targetId },
      'Cannot update the target path. The associated git provider has no token configured.',
    );
    this.name = 'TargetPathUpdateForbiddenError';
  }
}
