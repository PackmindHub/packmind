import React, { useCallback, useState } from 'react';
import { ActiveConfigurationSection } from '../ActiveConfigurationsList';
import { ActiveConfigurationSectionData as ActiveConfigurationCardData } from '../ActiveConfigurationSection/';
import {
  DetectionDraftCard,
  DraftCardData,
} from '../DetectionDraftCard/DetectionDraftCard';
import { DetectionAccordion } from './DetectionAccordion';
import { ExecutionLogsDrawer } from '../ExecutionLogsDrawer';
import { ProgramContentDrawer } from '../ProgramContentDrawer';
import {
  AccordionProgramActionButtons,
  ViewMode,
} from './AccordionProgramActionButtons';

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
  const [viewMode, setViewMode] = useState<ViewMode>('active');
  const activeDraft = draftPrograms[0];

  // Determine if we have both active program and draft
  const hasActiveProgram = activeConfigurations.some(
    (config) => config.detectionProgram,
  );
  const hasDraft = !!activeDraft;

  // Compute what content to show based on view mode from composer
  // Logic based on the truth table:
  // Draft Active DefaultView ShowSwitch
  //   0     0      active       0  (show active section, even if empty)
  //   0     1      active       0  (show active only)
  //   1     0      draft        0  (show draft only)
  //   1     1      active       1  (show toggle, default active, switch between views)
  const shouldShowDraft =
    hasDraft && !hasActiveProgram ? true : viewMode === 'draft';
  const shouldShowActive = !shouldShowDraft;

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);

  return (
    <DetectionAccordion
      title="Program"
      actions={
        <AccordionProgramActionButtons
          activeConfigurations={activeConfigurations}
          activeDraft={activeDraft}
          onTestProgram={onTestProgram}
          onGenerateProgram={onGenerateProgram}
          onActivateDraft={onActivateDraft}
          onRetryDraft={onRetryDraft}
          isGeneratingProgram={isGeneratingProgram}
          selectedLanguage={selectedLanguage}
          onViewModeChange={handleViewModeChange}
          standardId={standardId}
          ruleId={ruleId}
          onShowLogs={() => setIsLogsDrawerOpen(true)}
          onShowProgram={() => setIsProgramDrawerOpen(true)}
          isActivating={
            activatingDraftId === activeDraft?.id && isActivatingDraft
          }
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
