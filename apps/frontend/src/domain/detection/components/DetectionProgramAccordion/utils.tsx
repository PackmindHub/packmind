import React from 'react';
import { PMIcon, PMSpinner } from '@packmind/ui';
import { LuCircleCheck, LuCircleX } from 'react-icons/lu';
import {
  RuleDetectionAssessmentStatus,
  DetectionStatus,
} from '@packmind/types';
import {
  ActiveConfigurationSectionData as ActiveConfigurationCardData,
  ActiveConfigurationState,
} from '../ActiveConfigurationSection/';

export const renderStatusIcon = (status: RuleDetectionAssessmentStatus) => {
  switch (status) {
    case RuleDetectionAssessmentStatus.SUCCESS:
      return (
        <PMIcon color="text.success" size={'md'}>
          <LuCircleCheck />
        </PMIcon>
      );
    case RuleDetectionAssessmentStatus.FAILED:
      return (
        <PMIcon color="text.error" size={'md'}>
          <LuCircleX />
        </PMIcon>
      );
    case RuleDetectionAssessmentStatus.IN_PROGRESS:
      return <PMSpinner size="sm" />;
    default:
      return null;
  }
};

export const getProgramStatus = (
  activeConfigurations: ActiveConfigurationCardData[],
  isGeneratingProgram: boolean,
): RuleDetectionAssessmentStatus | null => {
  if (isGeneratingProgram) {
    return RuleDetectionAssessmentStatus.IN_PROGRESS;
  }

  const hasOutdated = activeConfigurations.some(
    (config) => config.state === ActiveConfigurationState.OUTDATED,
  );
  const hasPendingReview = activeConfigurations.some(
    (config) =>
      config.state === ActiveConfigurationState.TO_REVIEW ||
      config.draftProgram,
  );
  const hasError = activeConfigurations.some(
    (config) =>
      config.detectionProgram?.status === DetectionStatus.ERROR ||
      config.detectionProgram?.status === DetectionStatus.FAILURE,
  );
  const hasSuccess = activeConfigurations.some(
    (config) => config.detectionProgram?.status === DetectionStatus.READY,
  );

  if (hasError) {
    return RuleDetectionAssessmentStatus.FAILED;
  }
  if (hasOutdated || hasPendingReview) {
    // Return a "warning" status for outdated/pending review
    return RuleDetectionAssessmentStatus.IN_PROGRESS; // We'll use this to show warning icon
  }
  if (hasSuccess) {
    return RuleDetectionAssessmentStatus.SUCCESS;
  }

  return null;
};
