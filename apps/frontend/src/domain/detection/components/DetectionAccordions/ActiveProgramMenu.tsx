import React, { useMemo } from 'react';
import { PMMenu, PMPortal, PMIcon, PMButton } from '@packmind/ui';
import { LuChevronDown } from 'react-icons/lu';
import { DetectionStatus } from '@packmind/types';
import { ActiveConfigurationSectionData } from '../ActiveConfigurationSection';

export enum ActiveProgramStatus {
  ACTIVE = 'active',
  TO_REVIEW = 'to_review',
}

interface MenuAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

interface ActiveProgramMenuProps {
  activeConfigurations: ActiveConfigurationSectionData[];
  onTestProgram: (config: ActiveConfigurationSectionData) => void;
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
  onGenerateProgram,
  isGeneratingProgram,
  selectedLanguage,
}) => {
  const status = determineActiveStatus(activeConfigurations);

  const actions = useMemo<MenuAction[]>(() => {
    const menuActions: MenuAction[] = [];

    const activeConfig = activeConfigurations.find(
      (config) => config.detectionProgram?.status === DetectionStatus.READY,
    );

    if (activeConfig) {
      menuActions.push({
        label: 'Test program',
        onClick: () => onTestProgram(activeConfig),
      });
    }

    if (onGenerateProgram && !isGeneratingProgram) {
      menuActions.push({
        label: 'Generate new draft',
        onClick: () => onGenerateProgram(selectedLanguage),
      });
    }

    return menuActions;
  }, [
    activeConfigurations,
    onTestProgram,
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
                {action.label}
              </PMMenu.Item>
            ))}
          </PMMenu.Content>
        </PMMenu.Positioner>
      </PMPortal>
    </PMMenu.Root>
  );
};
