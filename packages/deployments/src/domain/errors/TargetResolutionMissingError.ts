import { DeploymentsInternalError } from './DeploymentsInternalError';

/**
 * A per-target entry is missing from a map this use case built itself, for a
 * target that is in the very list the map was keyed from.
 *
 * `stage` names which of the two resolutions dropped it, so the log says
 * where the two collections diverged without needing a distinct class each.
 */
export class TargetResolutionMissingError extends DeploymentsInternalError {
  constructor(
    readonly stage: 'removal_data' | 'artifact_resolution',
    targetId: string,
  ) {
    super(
      'target_resolution_missing',
      { targetId, stage },
      `No ${stage.replace('_', ' ')} was resolved for target ${targetId}`,
    );
    this.name = 'TargetResolutionMissingError';
  }
}
