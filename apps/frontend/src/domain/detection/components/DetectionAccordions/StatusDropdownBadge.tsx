import React from 'react';
import {
  PMBox,
  PMMenu,
  PMPortal,
  PMIcon,
  PMVStack,
  PMText,
} from '@packmind/ui';
import { LuChevronDown } from 'react-icons/lu';

export interface StatusMenuAction {
  label: string;
  onClick: () => void;
}

export interface StatusTooltipData {
  version?: number;
  createdAt?: Date;
}

export enum BadgeStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  IN_PROGRESS = 'IN_PROGRESS',
}

interface StatusDropdownBadgeProps {
  status: BadgeStatus;
  tooltipData?: StatusTooltipData;
  menuActions: StatusMenuAction[];
}

export interface BadgeConfig {
  text: string;
  colorPalette: 'green' | 'red' | 'blue';
}

const STATUS_CONFIG: Record<BadgeStatus, BadgeConfig> = {
  [BadgeStatus.SUCCESS]: {
    text: 'Active',
    colorPalette: 'green',
  },
  [BadgeStatus.FAILED]: {
    text: 'Failed',
    colorPalette: 'red',
  },
  [BadgeStatus.IN_PROGRESS]: {
    text: 'In progress',
    colorPalette: 'blue',
  },
};

export const getBadgeConfig = (status: BadgeStatus): BadgeConfig => {
  return STATUS_CONFIG[status];
};

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const StatusDropdownBadge: React.FC<StatusDropdownBadgeProps> = ({
  status,
  tooltipData,
  menuActions,
}) => {
  const config = getBadgeConfig(status);

  return (
    <PMMenu.Root>
      <PMMenu.Trigger asChild>
        <PMBox
          as="span"
          backgroundColor={`${config.colorPalette}.solid`}
          color="white"
          px={2}
          py={0.5}
          borderRadius="full"
          fontSize="xs"
          fontWeight="small"
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
          {config.text}
          <PMIcon size="xs">
            <LuChevronDown />
          </PMIcon>
        </PMBox>
      </PMMenu.Trigger>
      <PMPortal>
        <PMMenu.Positioner>
          <PMMenu.Content>
            {tooltipData && (tooltipData.version || tooltipData.createdAt) && (
              <>
                <PMBox px={3} py={2}>
                  <PMVStack gap={2} alignItems="flex-start">
                    <PMText fontWeight="semibold" fontSize="sm">
                      Information
                    </PMText>
                    {tooltipData.version && (
                      <PMVStack gap={1} alignItems="flex-start" width="full">
                        <PMText fontSize="xs" color="secondary">
                          Version
                        </PMText>
                        <PMText fontSize="sm">{tooltipData.version}</PMText>
                      </PMVStack>
                    )}
                    {tooltipData.createdAt && (
                      <PMVStack gap={1} alignItems="flex-start" width="full">
                        <PMText fontSize="xs" color="secondary">
                          Generation details
                        </PMText>
                        <PMText fontSize="sm">
                          {formatDate(tooltipData.createdAt)}
                        </PMText>
                      </PMVStack>
                    )}
                  </PMVStack>
                </PMBox>
                <PMMenu.Separator />
              </>
            )}
            {menuActions.map((action, index) => (
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
