import React, { useMemo } from 'react';
import {
  PMAccordion,
  PMBox,
  PMHStack,
  PMSpinner,
  PMText,
  PMVStack,
  PMIcon,
} from '@packmind/ui';
import {
  RuleDetectionAssessmentStatus,
  DetectionStatus,
} from '@packmind/types';
import { LuCircleCheck, LuCircleX } from 'react-icons/lu';
import { useGetRuleDetectionAssessmentQuery } from '../api/queries/DetectionProgramQueries';
import { ActiveConfigurationSection } from './ActiveConfigurationSection';
import { DraftsSection } from './DraftsSection';
import { ActiveConfigurationCardData } from './ActiveConfigurationCard';
import { DraftCardData } from './DetectionDraftCard';
import { DetectabilitySection } from './DetectabilitySection';

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

interface AccordionSectionProps {
  value: string;
  defaultOpen: boolean;
  triggerContent: React.ReactNode;
  children: React.ReactNode;
  disabled?: boolean;
}

const renderStatusIcon = (status: RuleDetectionAssessmentStatus) => {
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

const getProgramStatus = (
  activeConfigurations: ActiveConfigurationCardData[],
  isGeneratingProgram: boolean,
): RuleDetectionAssessmentStatus | null => {
  if (isGeneratingProgram) {
    return RuleDetectionAssessmentStatus.IN_PROGRESS;
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
    return RuleDetectionAssessmentStatus.FAILED;
  }
  if (hasSuccess) {
    return RuleDetectionAssessmentStatus.SUCCESS;
  }

  return null;
};

const AccordionSection: React.FC<AccordionSectionProps> = ({
  value,
  defaultOpen,
  triggerContent,
  children,
  disabled = false,
}) => {
  return (
    <PMAccordion.Root
      defaultValue={defaultOpen && !disabled ? [value] : []}
      collapsible
      backgroundColor={disabled ? 'background.tertiary' : 'background.primary'}
      p="2"
      rounded="md"
      variant="plain"
      disabled={disabled}
    >
      <PMAccordion.Item value={value} disabled={disabled}>
        <PMAccordion.ItemTrigger
          cursor={disabled ? 'not-allowed' : 'pointer'}
          disabled={disabled}
        >
          {triggerContent}
        </PMAccordion.ItemTrigger>
        {!disabled && (
          <PMAccordion.ItemContent>{children}</PMAccordion.ItemContent>
        )}
      </PMAccordion.Item>
    </PMAccordion.Root>
  );
};

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

  const programStatus = useMemo(
    () => getProgramStatus(activeConfigurations, isGeneratingProgram),
    [activeConfigurations, isGeneratingProgram],
  );

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
        defaultOpen={defaultAccordionValue.includes('detectability')}
      />

      {/* Program Accordion */}
      <AccordionSection
        value="program"
        defaultOpen={
          !isProgramDisabled && defaultAccordionValue.includes('program')
        }
        disabled={isProgramDisabled}
        triggerContent={
          <PMHStack gap={3} align="center" width="full">
            <PMAccordion.ItemIndicator />
            <PMText>Program</PMText>
            <PMBox marginLeft="auto">
              {programStatus && renderStatusIcon(programStatus)}
            </PMBox>
          </PMHStack>
        }
      >
        <PMVStack alignItems="stretch" gap={6} p={4}>
          <ActiveConfigurationSection
            configurations={activeConfigurations}
            isLoading={isLoadingActivePrograms}
            isError={isActiveProgramsError}
            onGenerateProgram={onGenerateProgram}
            isGeneratingProgram={isGeneratingProgram}
            standardId={standardId}
            ruleId={ruleId}
            onTestProgram={onTestProgram}
            onActivateDraft={onActivateDraft}
            activatingDraftId={activatingDraftId}
            isActivatingDraft={isActivatingDraft}
          />

          <DraftsSection
            drafts={draftPrograms}
            isLoading={isLoadingActivePrograms}
            isError={isActiveProgramsError}
            onMakeActive={onActivateDraft}
            activatingDraftId={activatingDraftId}
            isActivatingDraft={isActivatingDraft}
            onTestDraft={onTestProgram}
            onRetryDraft={onRetryDraft}
            isGeneratingProgram={isGeneratingProgram}
            standardId={standardId}
            ruleId={ruleId}
          />
        </PMVStack>
      </AccordionSection>
    </PMVStack>
  );
};
