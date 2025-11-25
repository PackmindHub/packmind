import React, { useMemo } from 'react';
import { PMBox, PMMenu, PMPortal, PMIcon } from '@packmind/ui';
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

const getColorPalette = (status: ActiveProgramStatus): 'green' | 'orange' => {
  switch (status) {
    case ActiveProgramStatus.ACTIVE:
      return 'green';
    case ActiveProgramStatus.TO_REVIEW:
      return 'orange';
  }
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

  const menuLabel = getMenuLabel(status);
  const colorPalette = getColorPalette(status);

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
          {menuLabel}
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
