import { ArtifactType, DomainError, DomainErrorKind } from '@packmind/types';

export type DeploymentsErrorReason =
  | 'space_not_accessible'
  | 'package_not_found'
  | 'artefact_not_in_space';

export type DeploymentsErrorContext = {
  organizationId?: string;
  spaceId?: string;
  packageId?: string;
  artefactId?: string;
  artefactType?: ArtifactType;
};

/**
 * Base for the deployments domain errors, in the same shape as
 * `UserAccessError`: the `kind` decides the HTTP answer, the literal `reason`
 * is what a client branches on, and `context` carries the ids for the log
 * instead of only being interpolated into the message.
 */
export class DeploymentsError extends Error implements DomainError {
  readonly kind: DomainErrorKind;
  readonly reason: DeploymentsErrorReason;
  readonly context: DeploymentsErrorContext;

  constructor(
    kind: DomainErrorKind,
    reason: DeploymentsErrorReason,
    context: DeploymentsErrorContext,
    message: string,
  ) {
    super(message);
    this.name = 'DeploymentsError';
    this.kind = kind;
    this.reason = reason;
    this.context = context;
  }
}
