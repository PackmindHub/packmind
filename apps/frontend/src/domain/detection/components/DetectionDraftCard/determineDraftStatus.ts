import {
  DetectionStatus,
  RuleDetectionAssessmentStatus,
} from '@packmind/types';

export enum DraftStatus {
  ASSESSING = 'assessing',
  ASSESSMENT_FAILED = 'assessment_failed',
  ASSESSMENT_SUCCESSFUL = 'assessment_successful',
  GENERATING = 'generating',
  GENERATION_FAILED = 'generation_failed',
  GENERATION_SUCCESSFUL = 'generation_successful',
  TO_REVIEW = 'to_review',
}

export function determineDraftStatus(
  assessmentStatus: RuleDetectionAssessmentStatus | undefined,
  draftStatus: DetectionStatus | string,
): DraftStatus {
  // If no assessment or assessment is running
  if (
    !assessmentStatus ||
    assessmentStatus === RuleDetectionAssessmentStatus.NOT_STARTED ||
    assessmentStatus === RuleDetectionAssessmentStatus.IN_PROGRESS
  ) {
    return DraftStatus.ASSESSING;
  }

  // If assessment failed
  if (assessmentStatus === RuleDetectionAssessmentStatus.FAILED) {
    return DraftStatus.ASSESSMENT_FAILED;
  }

  // If assessment succeeded
  if (assessmentStatus === RuleDetectionAssessmentStatus.SUCCESS) {
    // Check draft status
    if (draftStatus === DetectionStatus.IN_PROGRESS) {
      return DraftStatus.GENERATING;
    }

    if (
      draftStatus === DetectionStatus.FAILURE ||
      draftStatus === DetectionStatus.ERROR
    ) {
      return DraftStatus.GENERATION_FAILED;
    }

    if (draftStatus === DetectionStatus.READY) {
      return DraftStatus.GENERATION_SUCCESSFUL;
    }

    if (draftStatus === DetectionStatus.TO_REVIEW) {
      return DraftStatus.TO_REVIEW;
    }

    // Assessment successful but generation hasn't started or is in an intermediate state
    return DraftStatus.ASSESSMENT_SUCCESSFUL;
  }

  // Default fallback
  return DraftStatus.ASSESSING;
}
