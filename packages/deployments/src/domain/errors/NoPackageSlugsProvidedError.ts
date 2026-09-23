import { DeploymentsError } from '@packmind/types';

/**
 * The command named no package to act on.
 *
 * Malformed on its face — it does not depend on any stored state — so it is
 * `invalid_input` and answers 400.
 */
export class NoPackageSlugsProvidedError extends DeploymentsError {
  constructor() {
    super(
      'invalid_input',
      'no_package_slugs_provided',
      {},
      'No package slugs provided. Please specify at least one package slug.',
    );
    this.name = 'NoPackageSlugsProvidedError';
  }
}
