import React, { useEffect, useMemo, useState } from 'react';
import { PMVStack, PMEmptyState, PMButton } from '@packmind/ui';
import { RuleDetectionAssessmentStatus } from '@packmind/types';
import { useGetRuleDetectionAssessmentQuery } from '../api/queries/DetectionProgramQueries';
import { ActiveConfigurationSectionData as ActiveConfigurationCardData } from './ActiveConfigurationSection/';
import { DraftCardData } from './DetectionDraftCard/DetectionDraftCard';
import {
  DetectabilitySection,
  ProgramGenerationAccordion,
  DetectionAccordion,
  DetectionAccordionStatus,
} from './DetectionAccordions';

interface DetectionProgramConfigurationProps {
  standardId: string;
  standardName?: string;
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

export const DetectionProgramConfiguration: React.FC<
  DetectionProgramConfigurationProps
> = ({
  standardId,
  standardName,
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

  const hasNoExamples = useMemo(() => {
    // Check if the selected language has examples by checking if it's in detectionLanguages
    return !detectionLanguages.includes(selectedLanguage);
  }, [detectionLanguages, selectedLanguage]);

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

      <ProgramGenerationAccordion
        isOpen={isProgramOpen}
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
        selectedLanguage={selectedLanguage}
        onOpenChange={setIsProgramOpen}
        disabled={isProgramDisabled}
      />
    </PMVStack>
  );
};
