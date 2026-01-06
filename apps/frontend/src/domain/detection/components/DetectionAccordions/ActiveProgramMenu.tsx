import React, { useMemo } from 'react';
import {
  PMMenu,
  PMPortal,
  PMIcon,
  PMButton,
  PMText,
  PMVStack,
  PMSeparator,
} from '@packmind/ui';
import { LuChevronDown, LuPlay, LuFileText, LuSparkles } from 'react-icons/lu';
import { DetectionStatus } from '@packmind/types';
import { ActiveConfigurationSectionData } from '../ActiveConfigurationSection';
import { formatDate } from '../../../../shared/utils/dateUtils';

export enum ActiveProgramStatus {
  ACTIVE = 'active',
  TO_REVIEW = 'to_review',
}

interface MenuAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
}

interface ActiveProgramMenuProps {
  activeConfigurations: ActiveConfigurationSectionData[];
  onTestProgram: (config: ActiveConfigurationSectionData) => void;
  onShowDetails: (config: ActiveConfigurationSectionData) => void;
  onGenerateProgram: (language?: string) => void;
  isGeneratingProgram: boolean;
  selectedLanguage: string;
}

const determineActiveStatus = (
  activeConfigurations: ActiveConfigurationSectionData[],
): ActiveProgramStatus => {
  const hasReadyConfig = activeConfigurations.some(
    (config) => config.detectionProgram?.status === DetectionStatus.READY,
  );

  if (hasReadyConfig) {
    return ActiveProgramStatus.ACTIVE;
  }

  const hasToReviewConfig = activeConfigurations.some(
    (config) => config.detectionProgram?.status === DetectionStatus.TO_REVIEW,
  );

  if (hasToReviewConfig) {
    return ActiveProgramStatus.TO_REVIEW;
  }

  return ActiveProgramStatus.ACTIVE;
};

const getMenuLabel = (status: ActiveProgramStatus): string => {
  switch (status) {
    case ActiveProgramStatus.ACTIVE:
      return 'Active';
    case ActiveProgramStatus.TO_REVIEW:
      return 'To review';
  }
};

const getButtonVariant = (
  status: ActiveProgramStatus,
): 'success' | 'warning' => {
  if (status === ActiveProgramStatus.ACTIVE) {
    return 'success';
  }
  return 'warning';
};

export const ActiveProgramMenu: React.FC<ActiveProgramMenuProps> = ({
  activeConfigurations,
  onTestProgram,
  onShowDetails,
  onGenerateProgram,
  isGeneratingProgram,
  selectedLanguage,
}) => {
  const status = determineActiveStatus(activeConfigurations);

  // Find config with READY status for full actions
  const readyConfig = activeConfigurations.find(
    (config) => config.detectionProgram?.status === DetectionStatus.READY,
  );

  // Find config with TO_REVIEW status for details action
  const toReviewConfig = activeConfigurations.find(
    (config) => config.detectionProgram?.status === DetectionStatus.TO_REVIEW,
  );

  // Use ready config if available, otherwise to review config
  const activeConfig = readyConfig ?? toReviewConfig;

  // Check if any draft is pending (IN_PROGRESS) or ready (READY)
  const hasPendingOrReadyDraft = activeConfigurations.some(
    (config) =>
      config.draftProgram?.status === DetectionStatus.IN_PROGRESS ||
      config.draftProgram?.status === DetectionStatus.READY,
  );

  const actions = useMemo<MenuAction[]>(() => {
    const menuActions: MenuAction[] = [];

    if (readyConfig) {
      // Full actions for READY status
      menuActions.push({
        label: 'Test program',
        onClick: () => onTestProgram(readyConfig),
        icon: <LuPlay />,
      });
      menuActions.push({
        label: 'Generation details',
        onClick: () => onShowDetails(readyConfig),
        icon: <LuFileText />,
      });
    } else if (toReviewConfig) {
      // Limited actions for TO_REVIEW status - just show details
      menuActions.push({
        label: 'Generation details',
        onClick: () => onShowDetails(toReviewConfig),
        icon: <LuFileText />,
      });
    }

    if (onGenerateProgram) {
      menuActions.push({
        label: 'Generate new draft',
        onClick: () => onGenerateProgram(selectedLanguage),
        icon: <LuSparkles />,
        disabled: isGeneratingProgram || hasPendingOrReadyDraft,
      });
    }

    return menuActions;
  }, [
    readyConfig,
    toReviewConfig,
    onTestProgram,
    onShowDetails,
    onGenerateProgram,
    isGeneratingProgram,
    hasPendingOrReadyDraft,
    selectedLanguage,
  ]);

  // Don't render if no actions or if we're only generating without an active program
  const hasActiveProgram = readyConfig || toReviewConfig;
  if (actions.length === 0 || (!hasActiveProgram && isGeneratingProgram)) {
    return null;
  }

  return (
    <PMMenu.Root>
      <PMMenu.Trigger asChild>
        <PMButton
          variant={getButtonVariant(status)}
          size="2xs"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
          }}
        >
          {getMenuLabel(status)}
          <PMIcon size="xs">
            <LuChevronDown />
          </PMIcon>
        </PMButton>
      </PMMenu.Trigger>
      <PMPortal>
        <PMMenu.Positioner>
          <PMMenu.Content>
            <PMVStack alignItems="left" px="1" pb="2">
              <PMText variant={'body-important'}>Information</PMText>
              <PMText fontSize={'sm'}>
                Version: {activeConfig?.detectionProgram?.version}
              </PMText>
              {activeConfig?.detectionProgram?.createdAt && (
                <PMText fontSize={'sm'}>
                  Generated on{' '}
                  {formatDate(activeConfig.detectionProgram.createdAt)}
                </PMText>
              )}
            </PMVStack>
            <PMSeparator borderColor="border.tertiary" pb="2" />
            {actions.map((action, index) => (
              <PMMenu.Item
                key={index}
                value={action.label}
                cursor={action.disabled ? 'not-allowed' : 'pointer'}
                disabled={action.disabled}
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!action.disabled) {
                    action.onClick();
                  }
                }}
              >
                {action.icon && (
                  <PMIcon size="sm" mr={2}>
                    {action.icon}
                  </PMIcon>
                )}
                {action.label}
              </PMMenu.Item>
            ))}
          </PMMenu.Content>
        </PMMenu.Positioner>
      </PMPortal>
    </PMMenu.Root>
  );
};
