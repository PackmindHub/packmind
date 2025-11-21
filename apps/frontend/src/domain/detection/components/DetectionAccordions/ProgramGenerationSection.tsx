import React from 'react';
import { PMVStack } from '@packmind/ui';
import { ActiveConfigurationSection } from '../ActiveConfigurationSection';
import { ActiveConfigurationCardData } from '../ActiveConfigurationCard';
import {
  DetectionDraftCard,
  DraftCardData,
} from '../DetectionDraftCard/DetectionDraftCard';

interface ProgramGenerationSectionProps {
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
}

export const ProgramGenerationSection: React.FC<
  ProgramGenerationSectionProps
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
}) => {
  const activeDraft = draftPrograms[0];

  return (
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
    </PMVStack>
  );
};
