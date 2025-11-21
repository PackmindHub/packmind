import React from 'react';
import { PMHStack, PMText, PMVStack, PMAccordion } from '@packmind/ui';
import {
  RuleDetectionAssessmentStatus,
  DetectionStatus,
} from '@packmind/types';
import { ActiveConfigurationSection } from '../ActiveConfigurationsList';
import { DraftsSection } from '../DraftsSection';
import {
  ActiveConfigurationSectionData as ActiveConfigurationCardData,
  ActiveConfigurationState,
} from '../ActiveConfigurationSection/';
import { DraftCardData } from '../DetectionDraftCard';
import { ProgramGenerationTimeline } from '../ProgramGenerationTimeline';
import { ProgramStateSummary } from '../ProgramStateSummary';
import { AccordionSection } from './AccordionSection';

interface ProgramAccordionSectionProps {
  standardId: string;
  ruleId: string;
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
  assessmentStatus?: RuleDetectionAssessmentStatus;
  defaultOpen?: boolean;
  disabled?: boolean;
}

export const ProgramAccordionSection: React.FC<
  ProgramAccordionSectionProps
> = ({
  standardId,
  ruleId,
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
  assessmentStatus,
  defaultOpen = true,
  disabled = false,
}) => {
  // Get active program info for summary
  const activeProgramInfo = React.useMemo(() => {
    const activeConfig = activeConfigurations.find(
      (config) => config.detectionProgram?.status === DetectionStatus.READY,
    );
    if (!activeConfig || !activeConfig.detectionProgram) {
      return null;
    }
    return {
      version: activeConfig.detectionProgram.version,
      status: activeConfig.detectionProgram.status,
      createdAt: activeConfig.detectionProgram.createdAt,
      isOutdated:
        activeConfig.isOutdated ||
        activeConfig.state === ActiveConfigurationState.OUTDATED,
      hasDraftAvailable: !!activeConfig.draftProgram,
    };
  }, [activeConfigurations]);

  return (
    <AccordionSection
      value="program"
      defaultOpen={defaultOpen}
      disabled={disabled}
      triggerContent={
        <PMHStack gap={3} align="center" width="full" justify="space-between">
          <PMHStack gap={3} align="center">
            <PMAccordion.ItemIndicator />
            <PMText fontWeight="medium">Program</PMText>
          </PMHStack>
          <PMHStack gap={3} align="center">
            {activeProgramInfo && (
              <ProgramStateSummary
                version={activeProgramInfo.version}
                status={activeProgramInfo.status}
                createdAt={activeProgramInfo.createdAt}
                isOutdated={activeProgramInfo.isOutdated}
                hasDraftAvailable={activeProgramInfo.hasDraftAvailable}
                showDropdown={true}
              />
            )}
          </PMHStack>
        </PMHStack>
      }
    >
      <PMVStack alignItems="stretch" gap={6} p={4} width="full">
        <ProgramGenerationTimeline
          standardId={standardId}
          ruleId={ruleId}
          assessmentStatus={assessmentStatus}
          activeConfigurations={activeConfigurations}
          isGeneratingProgram={isGeneratingProgram}
          onTestProgram={onTestProgram}
        />

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
  );
};
