import React, { useEffect, useMemo, useState } from 'react';
import { PMVStack, PMEmptyState, PMButton } from '@packmind/ui';
import {
  RuleDetectionAssessmentStatus,
  DetectionStatus,
} from '@packmind/types';
import { useGetRuleDetectionAssessmentQuery } from '../api/queries/DetectionProgramQueries';
import { ActiveConfigurationSectionData as ActiveConfigurationCardData } from './ActiveConfigurationSection/';
import { DraftCardData } from './DetectionDraftCard/DetectionDraftCard';
import {
  DetectabilitySection,
  ProgramGenerationSection,
  DetectionAccordion,
  DetectionAccordionStatus,
  StatusMenuAction,
} from './DetectionAccordions';

interface DetectionProgramConfigurationProps {
  standardId: string;
  ruleId: string;
  detectionLanguages: string[];
  selectedLanguage: string;
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
  onNavigateToExamples?: () => void;
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
  selectedLanguage,
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
  onNavigateToExamples,
}) => {
  const language = selectedLanguage;

  const { data: assessment } = useGetRuleDetectionAssessmentQuery(
    standardId,
    ruleId,
    language,
  );

  // Controlled accordion state that updates when assessment loads
  const [isDetectabilityOpen, setIsDetectabilityOpen] = useState(false);
  const [isProgramOpen, setIsProgramOpen] = useState(false);

  useEffect(() => {
    const shouldOpenDetectability =
      assessment?.status === RuleDetectionAssessmentStatus.FAILED ||
      assessment?.status === RuleDetectionAssessmentStatus.IN_PROGRESS;
    const shouldOpenProgram =
      assessment?.status === RuleDetectionAssessmentStatus.SUCCESS;

    setIsDetectabilityOpen(shouldOpenDetectability);
    setIsProgramOpen(shouldOpenProgram);
  }, [assessment?.status]);

  const isProgramDisabled = useMemo(
    () => assessment?.status !== RuleDetectionAssessmentStatus.SUCCESS,
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

  const hasNoExamples = useMemo(() => {
    // Check if the selected language has examples by checking if it's in detectionLanguages
    return !detectionLanguages.includes(selectedLanguage);
  }, [detectionLanguages, selectedLanguage]);

  const programStatusTooltip = useMemo(() => {
    const activeConfig = activeConfigurations.find(
      (config) => config.detectionProgram?.status === DetectionStatus.READY,
    );
    if (!activeConfig?.detectionProgram) {
      return undefined;
    }
    return {
      version: activeConfig.detectionProgram.version,
      createdAt: activeConfig.detectionProgram.createdAt
        ? new Date(activeConfig.detectionProgram.createdAt)
        : undefined,
    };
  }, [activeConfigurations]);

  const programMenuActions = useMemo<StatusMenuAction[] | undefined>(() => {
    if (programStatus !== DetectionAccordionStatus.SUCCESS) {
      return undefined;
    }

    const activeConfig = activeConfigurations.find(
      (config) => config.detectionProgram?.status === DetectionStatus.READY,
    );

    if (!activeConfig) {
      return undefined;
    }

    const actions: StatusMenuAction[] = [];

    // Add "Test Program" action
    actions.push({
      label: 'Test program',
      onClick: () => onTestProgram(activeConfig),
    });

    // Add "Generate new draft" action
    if (onGenerateProgram && !isGeneratingProgram) {
      actions.push({
        label: 'Generate new draft',
        onClick: () => onGenerateProgram(selectedLanguage),
      });
    }

    return actions.length > 0 ? actions : undefined;
  }, [
    programStatus,
    activeConfigurations,
    onTestProgram,
    onGenerateProgram,
    isGeneratingProgram,
    selectedLanguage,
  ]);

  if (hasNoExamples) {
    return (
      <PMEmptyState
        backgroundColor={'background.primary'}
        borderRadius={'md'}
        width={'2xl'}
        mx={'auto'}
        mt={32}
        title={'No code examples for this language'}
      >
        Create code examples to document the rule usage and enable violation
        detection with Packmind linter
        <PMButton variant="primary" onClick={onNavigateToExamples}>
          Add
        </PMButton>
      </PMEmptyState>
    );
  }

  if (!language) {
    return null;
  }

  return (
    <PMVStack alignItems="stretch" gap={4} width="full">
      <DetectionAccordion
        title="Detectability"
        status={detectabilityStatus}
        open={isDetectabilityOpen}
        onOpenChange={setIsDetectabilityOpen}
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
        statusTooltip={programStatusTooltip}
        statusMenuActions={programMenuActions}
        open={isProgramOpen}
        onOpenChange={setIsProgramOpen}
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
