import { ArtifactType, DomainError, DomainErrorKind } from '@packmind/types';

export type DeploymentsErrorReason =
  | 'space_not_accessible'
  | 'package_not_found'
  | 'packages_not_found'
  | 'package_release_not_found'
  | 'package_release_refused'
  | 'no_package_slugs_provided'
  | 'artefact_not_in_space'
  | 'target_not_found'
  | 'invalid_target_name'
  | 'invalid_target_path'
  | 'git_repository_not_found'
  | 'root_target_not_deletable'
  | 'no_targets_provided'
  | 'no_packages_provided'
  | 'invalid_render_mode';

export type DeploymentsErrorContext = {
  organizationId?: string;
  spaceId?: string;
  packageId?: string;
  artefactId?: string;
  artefactType?: ArtifactType;
  targetId?: string;
  version?: string;
  slugs?: string[];
  gitRepoId?: string;
  path?: string;
  renderMode?: string;
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
