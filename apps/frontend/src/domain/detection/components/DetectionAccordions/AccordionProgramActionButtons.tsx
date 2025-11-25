import React, { useEffect, useState } from 'react';
import { PMButton, PMHStack } from '@packmind/ui';
import { ActiveConfigurationSectionData } from '../ActiveConfigurationSection';
import { DraftCardData } from '../DetectionDraftCard/DetectionDraftCard';
import { DetectionDraftMenu } from './DetectionDraftMenu';
import { ActiveProgramMenu } from './ActiveProgramMenu';

export type ViewMode = 'active' | 'draft';

interface AccordionProgramActionButtonsProps {
  activeConfigurations: ActiveConfigurationSectionData[];
  activeDraft?: DraftCardData;
  onTestProgram: (
    draft: DraftCardData | ActiveConfigurationSectionData,
  ) => void;
  onGenerateProgram: (language?: string) => void;
  onActivateDraft: (draft: DraftCardData) => void;
  onRetryDraft: (draft: DraftCardData) => void;
  isGeneratingProgram: boolean;
  selectedLanguage: string;
  onViewModeChange: (mode: ViewMode) => void;
  // Props for DetectionDraftMenu
  standardId: string;
  ruleId: string;
  onShowLogs: () => void;
  onShowProgram: () => void;
  isActivating?: boolean;
}

interface SwitchButtonProps {
  currentMode: ViewMode;
  onToggle: () => void;
}

const SwitchButton: React.FC<SwitchButtonProps> = ({
  currentMode,
  onToggle,
}) => {
  const config = {
    active: {
      text: 'See draft',
      colorPalette: 'primary' as const,
    },
    draft: {
      text: 'Go back',
      colorPalette: 'gray' as const,
    },
  };

  const current = config[currentMode];

  return (
    <PMButton
      backgroundColor={current.colorPalette}
      color={`${current.colorPalette}.fg`}
      px={2}
      py={0.5}
      borderRadius="full"
      fontSize="xs"
      fontWeight="medium"
      cursor="pointer"
      display="inline-flex"
      alignItems="center"
      gap={1}
      border="1px solid"
      borderColor={`${current.colorPalette}.emphasized`}
      _hover={{
        backgroundColor: `${current.colorPalette}.emphasized`,
      }}
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        onToggle();
      }}
    >
      {current.text}
    </PMButton>
  );
};

export const AccordionProgramActionButtons: React.FC<
  AccordionProgramActionButtonsProps
> = ({
  activeConfigurations,
  activeDraft,
  onTestProgram,
  onGenerateProgram,
  onActivateDraft,
  onRetryDraft,
  isGeneratingProgram,
  selectedLanguage,
  onViewModeChange,
  standardId,
  ruleId,
  onShowLogs,
  onShowProgram,
  isActivating,
}) => {
  // Compute derived state
  const hasActiveProgram = activeConfigurations.some(
    (config) => config.detectionProgram,
  );
  const hasDraft = !!activeDraft;
  const showToggle = hasActiveProgram && hasDraft;

  // Determine initial view mode based on what's available
  const getInitialViewMode = (): ViewMode => {
    if (hasDraft && !hasActiveProgram) {
      return 'draft';
    }
    return 'active';
  };

  const [viewMode, setViewMode] = useState<ViewMode>(getInitialViewMode);

  // Notify parent when view mode changes
  useEffect(() => {
    onViewModeChange(viewMode);
  }, [viewMode, onViewModeChange]);

  // Update view mode if conditions change
  useEffect(() => {
    if (hasDraft && !hasActiveProgram) {
      setViewMode('draft');
    } else if (!hasDraft && hasActiveProgram) {
      setViewMode('active');
    }
  }, [hasDraft, hasActiveProgram]);

  const handleToggle = () => {
    setViewMode((prev) => (prev === 'active' ? 'draft' : 'active'));
  };

  // Render based on current view mode
  return (
    <PMHStack gap={2}>
      {viewMode === 'active' && (
        <ActiveProgramMenu
          activeConfigurations={activeConfigurations}
          onTestProgram={onTestProgram}
          onGenerateProgram={onGenerateProgram}
          isGeneratingProgram={isGeneratingProgram}
          selectedLanguage={selectedLanguage}
        />
      )}

      {viewMode === 'draft' && activeDraft && (
        <DetectionDraftMenu
          draft={activeDraft}
          onMakeActive={onActivateDraft}
          isActivating={isActivating}
          onTestDraft={onTestProgram}
          onRetryDraft={onRetryDraft}
          isGenerating={isGeneratingProgram}
          standardId={standardId}
          ruleId={ruleId}
          onShowLogs={onShowLogs}
          onShowProgram={onShowProgram}
        />
      )}

      {showToggle && (
        <SwitchButton currentMode={viewMode} onToggle={handleToggle} />
      )}
    </PMHStack>
  );
};
