import React, { useMemo } from 'react';
import {
  PMMenu,
  PMPortal,
  PMIcon,
  PMButton,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { LuChevronDown, LuPlay, LuSparkles, LuFileText } from 'react-icons/lu';
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
  onGenerateProgram: (language?: string) => void;
  onShowDetails: (config: ActiveConfigurationSectionData) => void;
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
  onGenerateProgram,
  onShowDetails,
  isGeneratingProgram,
  selectedLanguage,
}) => {
  const status = determineActiveStatus(activeConfigurations);
  const activeConfig = activeConfigurations.find(
    (config) => config.detectionProgram?.status === DetectionStatus.READY,
  );

  const actions = useMemo<MenuAction[]>(() => {
    const menuActions: MenuAction[] = [];

    if (activeConfig) {
      menuActions.push({
        label: 'Test program',
        onClick: () => onTestProgram(activeConfig),
        icon: <LuPlay />,
      });
      menuActions.push({
        label: 'Generation details',
        onClick: () => onShowDetails(activeConfig),
        icon: <LuFileText />,
      });
    }

    if (onGenerateProgram && !isGeneratingProgram) {
      menuActions.push({
        label: 'Generate new draft',
        onClick: () => onGenerateProgram(selectedLanguage),
        icon: <LuSparkles />,
      });
    }

    return menuActions;
  }, [
    activeConfigurations,
    onTestProgram,
    onShowDetails,
    onGenerateProgram,
    isGeneratingProgram,
    selectedLanguage,
  ]);

  if (actions.length === 0) {
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
            <PMVStack alignItems="left">
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
            {actions.map((action, index) => (
              <PMMenu.Item
                key={index}
                value={action.label}
                cursor="pointer"
                disabled={action.disabled}
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                  action.onClick();
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
