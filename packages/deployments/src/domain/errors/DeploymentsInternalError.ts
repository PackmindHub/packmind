import { PackmindInternalError } from '@packmind/types';

import { ComponentFamily } from '../../application/services/packageReleaseResolution';

export type DeploymentsInternalErrorReason =
  | 'artefacts_move_failed'
  | 'package_reload_failed'
  | 'package_release_not_persisted'
  | 'package_component_has_no_version'
  | 'package_space_missing'
  | 'no_file_updates_resolved'
  | 'target_resolution_missing'
  | 'unsupported_render_mode'
  | 'render_mode_configuration_missing'
  | 'default_skill_id_missing'
  | 'adapter_ports_missing'
  | 'delayed_job_not_created';

export type DeploymentsInternalErrorContext = {
  packageId?: string;
  spaceId?: string;
  targetId?: string;
  version?: string;
  componentId?: string;
  family?: ComponentFamily;
  reverted?: boolean;
  cause?: string;
  stage?: 'removal_data' | 'artifact_resolution';
  organizationId?: string;
  renderMode?: string;
  slug?: string;
};

/**
 * Base for the deployments broken invariants, in the same shape as
 * `DeploymentsError` but on the internal side: no `kind` to choose — it is
 * always 500, logged with its stack and with its message withheld from the
 * client — a literal `reason` union naming the invariant and a typed `context`
 * carrying the ids.
 *
 * The line between this and `DeploymentsError` is fault, not severity: if the
 * caller could have avoided it by asking for something else, it is a
 * `DeploymentsError`. If the write already landed and the read after it
 * disagreed, it is this.
 */
export class DeploymentsInternalError extends PackmindInternalError {
  constructor(
    reason: DeploymentsInternalErrorReason,
    context: DeploymentsInternalErrorContext,
    message: string,
  ) {
    super(reason, context, message);
    this.name = 'DeploymentsInternalError';
  }
}
