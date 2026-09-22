import { DeploymentsError } from '@packmind/types';

/**
 * The command named no package to publish.
 *
 * Malformed on its face, independently of any stored state, so `invalid_input`.
 */
export class NoPackagesProvidedError extends DeploymentsError {
  constructor() {
    super(
      'invalid_input',
      'no_packages_provided',
      {},
      'At least one package must be provided',
    );
    this.name = 'NoPackagesProvidedError';
  }
}
