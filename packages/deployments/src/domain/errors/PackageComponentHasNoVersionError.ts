import { ComponentFamily } from '../../application/services/packageReleaseResolution';

import { DeploymentsInternalError } from './DeploymentsInternalError';

/**
 * A component of a package has no version at all.
 *
 * A broken invariant rather than a refusal: every component is versioned when
 * it is written, so one without a version means an earlier write left the
 * package in a state the caller could neither cause nor correct. It keeps the
 * 500, the stack and the withheld message.
 */
export class PackageComponentHasNoVersionError extends DeploymentsInternalError {
  constructor(
    readonly family: ComponentFamily,
    readonly componentId: string,
  ) {
    super(
      'package_component_has_no_version',
      { family, componentId },
      `${family.charAt(0).toUpperCase() + family.slice(1)} ${componentId} has no version to pin`,
    );
    this.name = 'PackageComponentHasNoVersionError';
  }
}
