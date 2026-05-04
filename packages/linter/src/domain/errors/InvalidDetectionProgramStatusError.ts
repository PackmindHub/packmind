import { DetectionStatus } from '@packmind/types';
import { DetectionProgramId } from '@packmind/types';

export class InvalidDetectionProgramStatusError extends Error {
  constructor(
    detectionProgramId: DetectionProgramId,
    currentStatus: DetectionStatus,
    requiredStatus: DetectionStatus,
  ) {
    super(
      `Detection program ${detectionProgramId} cannot be promoted as active. Current status: ${currentStatus}, required status: ${requiredStatus}`,
    );
    this.name = 'InvalidDetectionProgramStatusError';
  }
}
