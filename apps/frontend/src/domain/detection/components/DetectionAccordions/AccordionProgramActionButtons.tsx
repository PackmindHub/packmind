import React, { useEffect, useMemo, useState } from 'react';
import {
  PMBox,
  PMButton,
  PMHStack,
  PMIcon,
  PMMenu,
  PMPortal,
} from '@packmind/ui';
import { LuChevronDown } from 'react-icons/lu';
import { DetectionStatus } from '@packmind/types';
import { ActiveConfigurationSectionData } from '../ActiveConfigurationSection';
import { DraftCardData } from '../DetectionDraftCard/DetectionDraftCard';

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
}

interface MenuAction {
  label: string;
  onClick: () => void;
}

const DRAFT_STATUS_LABELS: Record<string, string> = {
  [DetectionStatus.READY]: 'Ready',
  [DetectionStatus.ERROR]: 'Error',
  [DetectionStatus.FAILURE]: 'Failed',
  [DetectionStatus.IN_PROGRESS]: 'In progress',
  [DetectionStatus.TO_REVIEW]: 'To review',
};

const getDraftStatusLabel = (status: DetectionStatus | string): string => {
  return DRAFT_STATUS_LABELS[status] || 'Draft';
};

const getDraftStatusColor = (
  status: DetectionStatus | string,
): 'green' | 'red' | 'blue' | 'gray' => {
  switch (status) {
    case DetectionStatus.READY:
      return 'green';
    case DetectionStatus.ERROR:
    case DetectionStatus.FAILURE:
      return 'red';
    case DetectionStatus.IN_PROGRESS:
      return 'blue';
    default:
      return 'gray';
  }
};

interface DropdownButtonProps {
  label: string;
  colorPalette: 'green' | 'red' | 'blue' | 'gray' | 'primary';
  actions: MenuAction[];
}

const DropdownButton: React.FC<DropdownButtonProps> = ({
  label,
  colorPalette,
  actions,
}) => {
  if (actions.length === 0) {
    return null;
  }

  return (
    <PMMenu.Root>
      <PMMenu.Trigger asChild>
        <PMBox
          as="span"
          backgroundColor={`${colorPalette}.solid`}
          color="white"
          px={2}
          py={0.5}
          borderRadius="full"
          fontSize="xs"
          fontWeight="medium"
          cursor="pointer"
          display="inline-flex"
          alignItems="center"
          gap={0.5}
          _hover={{
            opacity: 0.9,
          }}
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
          }}
        >
          {label}
          <PMIcon size="xs">
            <LuChevronDown />
          </PMIcon>
        </PMBox>
      </PMMenu.Trigger>
      <PMPortal>
        <PMMenu.Positioner>
          <PMMenu.Content>
            {actions.map((action, index) => (
              <PMMenu.Item
                key={index}
                value={action.label}
                cursor="pointer"
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                  action.onClick();
                }}
              >
                {action.label}
              </PMMenu.Item>
            ))}
          </PMMenu.Content>
        </PMMenu.Positioner>
      </PMPortal>
    </PMMenu.Root>
  );
};

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

  // Compute active menu actions
  const activeMenuActions = useMemo<MenuAction[]>(() => {
    const actions: MenuAction[] = [];

    const activeConfig = activeConfigurations.find(
      (config) => config.detectionProgram?.status === DetectionStatus.READY,
    );

    if (activeConfig) {
      actions.push({
        label: 'Test program',
        onClick: () => onTestProgram(activeConfig),
      });
    }

    if (onGenerateProgram && !isGeneratingProgram) {
      actions.push({
        label: 'Generate new draft',
        onClick: () => onGenerateProgram(selectedLanguage),
      });
    }

    return actions;
  }, [
    activeConfigurations,
    onTestProgram,
    onGenerateProgram,
    isGeneratingProgram,
    selectedLanguage,
  ]);

  // Compute draft menu actions
  const draftMenuActions = useMemo<MenuAction[]>(() => {
    if (!activeDraft) {
      return [];
    }

    const actions: MenuAction[] = [];
    const draftStatus = activeDraft.draftProgram.status;

    actions.push({
      label: 'Test draft',
      onClick: () => onTestProgram(activeDraft),
    });

    if (
      draftStatus === DetectionStatus.ERROR ||
      draftStatus === DetectionStatus.FAILURE
    ) {
      actions.push({
        label: 'Retry draft',
        onClick: () => onRetryDraft(activeDraft),
      });
    }

    if (draftStatus === DetectionStatus.READY) {
      actions.push({
        label: 'Activate draft',
        onClick: () => onActivateDraft(activeDraft),
      });
    }

    return actions;
  }, [activeDraft, onTestProgram, onRetryDraft, onActivateDraft]);

  // Compute draft status
  const draftStatus = activeDraft?.draftProgram.status;
  const draftStatusLabel = draftStatus
    ? `Draft: ${getDraftStatusLabel(draftStatus)}`
    : 'Draft';
  const draftStatusColor = draftStatus
    ? getDraftStatusColor(draftStatus)
    : 'gray';

  // Render based on current view mode
  return (
    <PMHStack gap={2}>
      {viewMode === 'active' && activeMenuActions.length > 0 && (
        <DropdownButton
          label="Active"
          colorPalette="green"
          actions={activeMenuActions}
        />
      )}

      {viewMode === 'draft' && draftMenuActions.length > 0 && (
        <DropdownButton
          label={draftStatusLabel}
          colorPalette={draftStatusColor}
          actions={draftMenuActions}
        />
      )}

      {showToggle && (
        <SwitchButton currentMode={viewMode} onToggle={handleToggle} />
      )}
    </PMHStack>
  );
};
