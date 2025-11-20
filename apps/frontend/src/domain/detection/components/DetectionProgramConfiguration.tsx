import React, { useMemo } from 'react';
import { PMVStack } from '@packmind/ui';
import {
  RuleDetectionAssessmentStatus,
  DetectionStatus,
} from '@packmind/types';
import { useGetRuleDetectionAssessmentQuery } from '../api/queries/DetectionProgramQueries';
import { ActiveConfigurationCardData } from './ActiveConfigurationCard';
import { DraftCardData } from './DetectionDraftCard';
import {
  DetectabilitySection,
  ProgramGenerationSection,
  DetectionAccordion,
  DetectionAccordionStatus,
} from './DetectionAccordions';

interface DetectionProgramConfigurationProps {
  standardId: string;
  ruleId: string;
  detectionLanguages: string[];
  activeConfigurations: ActiveConfigurationCardData[];
  draftPrograms: DraftCardData[];
  isLoadingActivePrograms: boolean;
  isActiveProgramsError: boolean;
  onGenerateProgram: (language?: string) => void;
  isGeneratingProgram: boolean;
  onTestProgram: (draft: DraftCardData | ActiveConfigurationCardData) => void;
  onActivateDraft: (draft: DraftCardData) => void;
  activatingDraftId: string | null;
  isActivatingDraft: boolean;
  onRetryDraft: (draft: DraftCardData) => void;
}

const convertToAccordionStatus = (
  status: RuleDetectionAssessmentStatus,
): DetectionAccordionStatus => {
  switch (status) {
    case RuleDetectionAssessmentStatus.SUCCESS:
      return DetectionAccordionStatus.SUCCESS;
    case RuleDetectionAssessmentStatus.FAILED:
      return DetectionAccordionStatus.FAILED;
    case RuleDetectionAssessmentStatus.IN_PROGRESS:
      return DetectionAccordionStatus.IN_PROGRESS;
    default:
      return DetectionAccordionStatus.IN_PROGRESS;
  }
};

const getProgramStatus = (
  activeConfigurations: ActiveConfigurationCardData[],
  isGeneratingProgram: boolean,
): DetectionAccordionStatus | undefined => {
  if (isGeneratingProgram) {
    return DetectionAccordionStatus.IN_PROGRESS;
  }

  const hasSuccess = activeConfigurations.some(
    (config) => config.detectionProgram?.status === DetectionStatus.READY,
  );
  const hasError = activeConfigurations.some(
    (config) =>
      config.detectionProgram?.status === DetectionStatus.ERROR ||
      config.detectionProgram?.status === DetectionStatus.FAILURE,
  );

  if (hasError) {
    return DetectionAccordionStatus.FAILED;
  }
  if (hasSuccess) {
    return DetectionAccordionStatus.SUCCESS;
  }

  return undefined;
};

export const DetectionProgramConfiguration: React.FC<
  DetectionProgramConfigurationProps
> = ({
  standardId,
  ruleId,
  detectionLanguages,
  activeConfigurations,
  draftPrograms,
  isLoadingActivePrograms,
  isActiveProgramsError,
  onGenerateProgram,
  isGeneratingProgram,
  onTestProgram,
  onActivateDraft,
  activatingDraftId,
  isActivatingDraft,
  onRetryDraft,
}) => {
  // Get the first available language for detectability queries
  const language = detectionLanguages.length > 0 ? detectionLanguages[0] : '';

  const { data: assessment } = useGetRuleDetectionAssessmentQuery(
    standardId,
    ruleId,
    language,
  );

  // Determine default accordion value based on assessment status
  const shouldOpenDetectability = useMemo(() => {
    return assessment?.status === RuleDetectionAssessmentStatus.FAILED;
  }, [assessment?.status]);

  const shouldOpenProgram = useMemo(() => {
    return assessment?.status !== RuleDetectionAssessmentStatus.FAILED;
  }, [assessment?.status]);

  const isProgramDisabled = useMemo(
    () => assessment?.status === RuleDetectionAssessmentStatus.FAILED,
    [assessment?.status],
  );

  const detectabilityStatus = useMemo(() => {
    return assessment?.status
      ? convertToAccordionStatus(assessment.status)
      : undefined;
  }, [assessment?.status]);

  const programStatus = useMemo(
    () => getProgramStatus(activeConfigurations, isGeneratingProgram),
    [activeConfigurations, isGeneratingProgram],
  );

  if (!language) {
    return null;
  }

  return (
    <PMVStack alignItems="stretch" gap={4} width="full">
      <DetectionAccordion
        title="Detectability"
        status={detectabilityStatus}
        defaultOpen={shouldOpenDetectability}
      >
        <DetectabilitySection
          standardId={standardId}
          ruleId={ruleId}
          language={language}
        />
      </DetectionAccordion>

      <DetectionAccordion
        title="Program"
        status={programStatus}
        defaultOpen={shouldOpenProgram}
        disabled={isProgramDisabled}
      >
        <ProgramGenerationSection
          standardId={standardId}
          ruleId={ruleId}
          activeConfigurations={activeConfigurations}
          draftPrograms={draftPrograms}
          isLoadingActivePrograms={isLoadingActivePrograms}
          isActiveProgramsError={isActiveProgramsError}
          onGenerateProgram={onGenerateProgram}
          isGeneratingProgram={isGeneratingProgram}
          onTestProgram={onTestProgram}
          onActivateDraft={onActivateDraft}
          activatingDraftId={activatingDraftId}
          isActivatingDraft={isActivatingDraft}
          onRetryDraft={onRetryDraft}
        />
      </DetectionAccordion>
    </PMVStack>
  );
};
