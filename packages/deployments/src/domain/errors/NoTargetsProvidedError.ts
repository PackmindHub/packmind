import { DeploymentsError } from './DeploymentsError';

/**
 * The command named no target to publish to.
 *
 * Malformed on its face, independently of any stored state, so `invalid_input`.
 */
export class NoTargetsProvidedError extends DeploymentsError {
  constructor() {
    super(
      'invalid_input',
      'no_targets_provided',
      {},
      'At least one target must be provided',
    );
    this.name = 'NoTargetsProvidedError';
  }
}
