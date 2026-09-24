import { StandardsInternalError } from './StandardsInternalError';

/**
 * A dependency the hexa needs at boot was not found in the registry.
 *
 * A wiring invariant: `dependency` names what was missing; no request could
 * avoid it.
 */
export class StandardsHexaDependencyMissingError extends StandardsInternalError {
  constructor(dependency: string) {
    super(
      'hexa_dependency_missing',
      { dependency },
      `${dependency} not found in registry`,
    );
    this.name = 'StandardsHexaDependencyMissingError';
  }
}
