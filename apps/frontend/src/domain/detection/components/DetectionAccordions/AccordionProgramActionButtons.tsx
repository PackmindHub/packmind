import React, { useEffect } from 'react';
import {
  PMButton,
  PMButtonGroup,
  PMIcon,
  PMMenu,
  PMPortal,
} from '@packmind/ui';
import { ActiveConfigurationSectionData } from '../ActiveConfigurationSection';
import { DraftCardData } from '../DetectionDraftCard/DetectionDraftCard';
import { DetectionDraftMenu, getMenuLabel } from './DetectionDraftMenu';
import { ActiveProgramMenu } from './ActiveProgramMenu';
import { LuChevronDown } from 'react-icons/lu';
import { determineDraftStatus } from '../DetectionDraftCard/determineDraftStatus';
import { useGetRuleDetectionAssessmentQuery } from '../../api/queries';

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
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  // Props for DetectionDraftMenu
  standardId: string;
  ruleId: string;
  onShowLogs: () => void;
  onShowProgram: () => void;
  onShowDetails: (config: ActiveConfigurationSectionData) => void;
  isActivating?: boolean;
}

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
  viewMode,
  onViewModeChange,
  standardId,
  ruleId,
  onShowLogs,
  onShowProgram,
  onShowDetails,
  isActivating,
}) => {
  // Compute derived state
  const hasActiveProgram = activeConfigurations.some(
    (config) => config.detectionProgram,
  );
  const hasDraft = !!activeDraft;
  const showToggle = hasActiveProgram && hasDraft;

  const { data: assessment } = useGetRuleDetectionAssessmentQuery(
    standardId,
    ruleId,
    activeDraft?.language ?? '',
  );

  // Update view mode if conditions change
  useEffect(() => {
    if (hasDraft && !hasActiveProgram) {
      onViewModeChange('draft');
    } else if (!hasDraft && hasActiveProgram) {
      onViewModeChange('active');
    }
  }, [hasDraft, hasActiveProgram, onViewModeChange]);

  const handleToggle = () => {
    onViewModeChange(viewMode === 'active' ? 'draft' : 'active');
  };

  const buttons: React.ReactNode[] = [];
  if (viewMode === 'active') {
    buttons.push(
      <ActiveProgramMenu
        key="active-menu"
        activeConfigurations={activeConfigurations}
        onTestProgram={onTestProgram}
        onShowDetails={onShowDetails}
        onGenerateProgram={onGenerateProgram}
        isGeneratingProgram={isGeneratingProgram}
        selectedLanguage={selectedLanguage}
      />,
    );
    if (showToggle) {
      buttons.push(
        <PMMenu.Root key="draft-toggle-menu">
          <PMMenu.Trigger asChild>
            <PMButton
              size="2xs"
              variant={'tertiary'}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
              }}
            >
              {getMenuLabel(
                determineDraftStatus(assessment?.status, activeDraft.status),
              )}
              <PMIcon size="xs">
                <LuChevronDown />
              </PMIcon>
            </PMButton>
          </PMMenu.Trigger>
          <PMPortal>
            <PMMenu.Positioner>
              <PMMenu.Content>
                <PMMenu.Item
                  value={'editDraft'}
                  onClick={(e: React.MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleToggle();
                  }}
                >
                  Edit draft
                </PMMenu.Item>
              </PMMenu.Content>
            </PMMenu.Positioner>
          </PMPortal>
        </PMMenu.Root>,
      );
    }
  } else {
    if (showToggle) {
      buttons.push(
        <PMButton
          key="back-button"
          size="2xs"
          variant={'tertiary'}
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            handleToggle();
          }}
        >
          Back
        </PMButton>,
      );
    }

    if (activeDraft) {
      buttons.push(
        <DetectionDraftMenu
          key="draft-menu"
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
        />,
      );
    }
  }

  // Render based on current view mode
  return <PMButtonGroup>{buttons}</PMButtonGroup>;
};
