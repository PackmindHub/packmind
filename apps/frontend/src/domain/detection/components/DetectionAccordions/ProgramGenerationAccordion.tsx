import React, { useMemo } from 'react';
import { ActiveConfigurationSection } from '../ActiveConfigurationsList';
import { ActiveConfigurationSectionData as ActiveConfigurationCardData } from '../ActiveConfigurationSection/';
import {
  DetectionDraftCard,
  DraftCardData,
} from '../DetectionDraftCard/DetectionDraftCard';
import {
  DetectionAccordion,
  DetectionAccordionStatus,
} from '@packmind/proprietary/frontend/domain/detection/components/DetectionAccordions/DetectionAccordion';
import { DetectionStatus } from '@packmind/types';
import { StatusMenuAction } from '@packmind/proprietary/frontend/domain/detection/components/DetectionAccordions/StatusDropdownBadge';

interface ProgramGenerationSectionProps {
  isOpen: boolean;
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
  selectedLanguage: string;
  onOpenChange: (open: boolean) => void;
  disabled: boolean;
}

export const ProgramGenerationAccordion: React.FC<
  ProgramGenerationSectionProps
> = ({
  isOpen,
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
  selectedLanguage,
  onOpenChange,
  disabled,
}) => {
  const activeDraft = draftPrograms[0];

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

  const programStatus = useMemo(
    () => getProgramStatus(activeConfigurations, isGeneratingProgram),
    [activeConfigurations, isGeneratingProgram],
  );

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

  return (
    <DetectionAccordion
      title="Program"
      status={programStatus}
      statusTooltip={programStatusTooltip}
      statusMenuActions={programMenuActions}
      open={isOpen}
      onOpenChange={onOpenChange}
      disabled={disabled}
    >
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

      {activeDraft && !isLoadingActivePrograms && (
        <DetectionDraftCard
          key={activeDraft.id}
          draft={activeDraft}
          onMakeActive={onActivateDraft}
          isActivating={
            activatingDraftId === activeDraft.id && isActivatingDraft
          }
          onTestDraft={onTestProgram}
          onRetryDraft={onRetryDraft}
          isGenerating={isGeneratingProgram}
          standardId={standardId}
          ruleId={ruleId}
        />
      )}
    </DetectionAccordion>
  );
};
