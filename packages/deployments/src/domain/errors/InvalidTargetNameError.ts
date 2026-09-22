import { DeploymentsError } from './DeploymentsError';

/**
 * The target was given no name, or a name that is only whitespace.
 *
 * Malformed on its face, independently of any stored state, so `invalid_input`.
 */
export class InvalidTargetNameError extends DeploymentsError {
  constructor() {
    super(
      'invalid_input',
      'invalid_target_name',
      {},
      'Target name cannot be empty',
    );
    this.name = 'InvalidTargetNameError';
  }
}
