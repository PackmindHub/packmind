import React, { useMemo } from 'react';
import { PMVStack } from '@packmind/ui';
import { RuleDetectionAssessmentStatus } from '@packmind/types';
import { useGetRuleDetectionAssessmentQuery } from '../../api/queries/DetectionProgramQueries';
import { ActiveConfigurationSectionData as ActiveConfigurationCardData } from '../ActiveConfigurationSection/';
import { DraftCardData } from '../DetectionDraftCard/DetectionDraftCard';
import { DetectabilitySection } from '../DetectionAccordions/DetectabilitySection';
import { ProgramAccordionSection } from './ProgramAccordionSection';

interface DetectionProgramAccordionProps {
  standardId: string;
  ruleId: string;
  detectionLanguages: string[];
  // Props from ProgramEditor for Program section
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

export const DetectionProgramAccordion: React.FC<
  DetectionProgramAccordionProps
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
  const defaultAccordionValue = useMemo(() => {
    if (assessment?.status === RuleDetectionAssessmentStatus.FAILED) {
      return ['detectability'];
    }
    return ['program'];
  }, [assessment?.status]);

  const isProgramDisabled = useMemo(
    () => assessment?.status === RuleDetectionAssessmentStatus.FAILED,
    [assessment?.status],
  );

  if (!language) {
    return null;
  }

  return (
    <PMVStack alignItems="stretch" gap={4} width="full">
      {/* Detectability Accordion */}
      <DetectabilitySection
        standardId={standardId}
        ruleId={ruleId}
        language={language}
      />

      {/* Program Accordion */}
      <ProgramAccordionSection
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
        assessmentStatus={assessment?.status}
        defaultOpen={
          !isProgramDisabled && defaultAccordionValue.includes('program')
        }
        disabled={isProgramDisabled}
      />
    </PMVStack>
  );
};
