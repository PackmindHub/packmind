import React, { useMemo, useState } from 'react';
import { ActiveConfigurationSection } from '../ActiveConfigurationsList';
import { ActiveConfigurationSectionData as ActiveConfigurationCardData } from '../ActiveConfigurationSection/';
import {
  DetectionDraftCard,
  DraftCardData,
} from '../DetectionDraftCard/DetectionDraftCard';
import {
  DetectionAccordion,
  DetectionAccordionStatus,
} from './DetectionAccordion';
import { DetectionStatus } from '@packmind/types';
import { StatusMenuAction } from './StatusDropdownBadge';
import { ExecutionLogsDrawer } from '../ExecutionLogsDrawer';
import { ProgramContentDrawer } from '../ProgramContentDrawer';
import { ViewToggleButton } from './ViewToggleButton';

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
    const [isLogsDrawerOpen, setIsLogsDrawerOpen] = useState(false);
    const [isProgramDrawerOpen, setIsProgramDrawerOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'active' | 'draft'>('active');
    const activeDraft = draftPrograms[0];

    // Determine if we have both active program and draft
    const hasActiveProgram = activeConfigurations.some(
      (config) => config.detectionProgram,
    );
    const hasDraft = !!activeDraft;
    const showToggle = hasActiveProgram && hasDraft;

    // Logic based on the truth table:
    // Draft Active DefaultView ShowSwitch
    //   0     0      active       0  (show active section, even if empty)
    //   0     1      active       0  (show active only)
    //   1     0      draft        0  (show draft only)
    //   1     1      active       1  (show toggle, default active, switch between views)
    const shouldShowDraft =
      hasDraft && !hasActiveProgram ? true : showToggle && viewMode === 'draft';
    const shouldShowActive =
      !shouldShowDraft || (showToggle && viewMode === 'active');

    const handleToggle = () => {
      setViewMode((prev) => (prev === 'active' ? 'draft' : 'active'));
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

    const getDraftProgramStatus = (
      draft: DraftCardData | undefined,
      isGeneratingProgram: boolean,
    ): DetectionAccordionStatus | undefined => {
      if (isGeneratingProgram) {
        return DetectionAccordionStatus.IN_PROGRESS;
      }

      if (!draft) {
        return undefined;
      }

      const status = draft.draftProgram.status;

      if (
        status === DetectionStatus.ERROR ||
        status === DetectionStatus.FAILURE
      ) {
        return DetectionAccordionStatus.FAILED;
      }
      if (
        status === DetectionStatus.READY ||
        status === DetectionStatus.TO_REVIEW
      ) {
        return DetectionAccordionStatus.SUCCESS;
      }
      if (status === DetectionStatus.IN_PROGRESS) {
        return DetectionAccordionStatus.IN_PROGRESS;
      }

      return undefined;
    };

    const programStatus = useMemo(() => {
      if (showToggle && viewMode === 'draft') {
        return getDraftProgramStatus(activeDraft, isGeneratingProgram);
      }
      return getProgramStatus(activeConfigurations, isGeneratingProgram);
    }, [
      activeConfigurations,
      isGeneratingProgram,
      viewMode,
      showToggle,
      activeDraft,
    ]);

    const programStatusTooltip = useMemo(() => {
      if (showToggle && viewMode === 'draft' && activeDraft) {
        return {
          version: activeDraft.draftProgram.version,
          createdAt: activeDraft.draftProgram.createdAt
            ? new Date(activeDraft.draftProgram.createdAt)
            : undefined,
        };
      }

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
    }, [activeConfigurations, viewMode, showToggle, activeDraft]);

    const programMenuActions = useMemo<StatusMenuAction[] | undefined>(() => {
      if (showToggle && viewMode === 'draft' && activeDraft) {
        const actions: StatusMenuAction[] = [];

        // Add "Test draft" action
        actions.push({
          label: 'Test draft',
          onClick: () => onTestProgram(activeDraft),
        });

        // Add "Retry draft" action if draft failed
        if (
          activeDraft.draftProgram.status === DetectionStatus.ERROR ||
          activeDraft.draftProgram.status === DetectionStatus.FAILURE
        ) {
          actions.push({
            label: 'Retry draft',
            onClick: () => onRetryDraft(activeDraft),
          });
        }

        // Add "Activate draft" action if draft is ready
        if (activeDraft.draftProgram.status === DetectionStatus.READY) {
          actions.push({
            label: 'Activate draft',
            onClick: () => onActivateDraft(activeDraft),
          });
        }

        return actions.length > 0 ? actions : undefined;
      }

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
      viewMode,
      showToggle,
      activeDraft,
      onRetryDraft,
      onActivateDraft,
    ]);

    return (
      <DetectionAccordion
        title="Program"
        status={programStatus}
        statusTooltip={programStatusTooltip}
        statusMenuActions={programMenuActions}
        statusAdditionalActions={
          <ViewToggleButton
            mode={viewMode}
            onToggle={handleToggle}
            showDraft={showToggle}
          />
        }
        open={isOpen}
        onOpenChange={onOpenChange}
        disabled={disabled}
      >
        {shouldShowActive && (
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
        )}

        {shouldShowDraft && activeDraft && !isLoadingActivePrograms && (
          <>
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
              onShowLogs={() => setIsLogsDrawerOpen(true)}
              onShowProgram={() => setIsProgramDrawerOpen(true)}
            />
            <ExecutionLogsDrawer
              isOpen={isLogsDrawerOpen}
              onClose={() => setIsLogsDrawerOpen(false)}
              standardId={standardId}
              ruleId={ruleId}
              detectionProgramId={activeDraft.draftProgram.id}
            />
            <ProgramContentDrawer
              isOpen={isProgramDrawerOpen}
              onClose={() => setIsProgramDrawerOpen(false)}
              standardId={standardId}
              ruleId={ruleId}
              detectionProgramId={activeDraft.draftProgram.id}
              programCode={activeDraft.draftProgram.code}
            />
          </>
        )}
      </DetectionAccordion>
    );
  };
