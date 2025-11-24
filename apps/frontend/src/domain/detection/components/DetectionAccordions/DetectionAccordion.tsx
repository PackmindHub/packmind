import React from 'react';
import {
  PMAccordion,
  PMBox,
  PMHStack,
  PMText,
  PMBadge,
  PMTooltip,
  PMVStack,
  PMSeparator,
} from '@packmind/ui';
import {
  StatusDropdownBadge,
  StatusMenuAction,
  StatusTooltipData,
  BadgeStatus,
  getBadgeConfig,
} from './StatusDropdownBadge';

export enum DetectionAccordionStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  IN_PROGRESS = 'IN_PROGRESS',
}

// Map DetectionAccordionStatus to BadgeStatus
const statusToBadgeStatus = (status: DetectionAccordionStatus): BadgeStatus => {
  switch (status) {
    case DetectionAccordionStatus.SUCCESS:
      return BadgeStatus.SUCCESS;
    case DetectionAccordionStatus.FAILED:
      return BadgeStatus.FAILED;
    case DetectionAccordionStatus.IN_PROGRESS:
      return BadgeStatus.IN_PROGRESS;
  }
};

interface DetectionAccordionProps {
  title: string;
  status?: DetectionAccordionStatus;
  statusTooltip?: StatusTooltipData;
  statusMenuActions?: StatusMenuAction[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disabled?: boolean;
  children: React.ReactNode;
}

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const renderStatusBadge = (
  status: DetectionAccordionStatus,
  tooltipData?: StatusTooltipData,
  menuActions?: StatusMenuAction[],
) => {
  // If menu actions are provided, render as dropdown button styled like a badge
  if (menuActions && menuActions.length > 0) {
    return (
      <StatusDropdownBadge
        status={statusToBadgeStatus(status)}
        tooltipData={tooltipData}
        menuActions={menuActions}
      />
    );
  }

  // Otherwise, render as regular badge (with optional tooltip)
  const badgeConfig = getBadgeConfig(statusToBadgeStatus(status));
  const badge = (
    <PMBadge colorPalette={badgeConfig.colorPalette} variant="solid">
      {badgeConfig.text}
    </PMBadge>
  );

  if (tooltipData && (tooltipData.version || tooltipData.createdAt)) {
    const tooltipContent = (
      <PMVStack gap={2} alignItems="flex-start" padding={1} minWidth="48">
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
          <>
            <PMSeparator width="full" />
            <PMVStack gap={1} alignItems="flex-start" width="full">
              <PMText fontSize="xs" color="secondary">
                Generation details
              </PMText>
              <PMText
                fontSize="sm"
                cursor="pointer"
                role="button"
                tabIndex={0}
                _hover={{ textDecoration: 'underline' }}
              >
                {formatDate(tooltipData.createdAt)}
              </PMText>
            </PMVStack>
          </>
        )}
      </PMVStack>
    );

    return (
      <PMTooltip label={tooltipContent} placement="top" showArrow>
        {badge}
      </PMTooltip>
    );
  }

  return badge;
};

export const DetectionAccordion: React.FC<DetectionAccordionProps> = ({
  title,
  status,
  statusTooltip,
  statusMenuActions,
  open,
  onOpenChange,
  disabled = false,
  children,
}) => {
  const accordionValue = 'content';
  const value = open && !disabled ? [accordionValue] : [];

  const handleValueChange = (details: { value: string[] }) => {
    onOpenChange(details.value.includes(accordionValue));
  };

  return (
    <PMAccordion.Root
      value={value}
      onValueChange={handleValueChange}
      collapsible
      backgroundColor={disabled ? 'background.tertiary' : 'background.primary'}
      px="4"
      py="2"
      rounded="md"
      variant="plain"
      disabled={disabled}
    >
      <PMAccordion.Item value={accordionValue} disabled={disabled}>
        <PMAccordion.ItemTrigger
          cursor={disabled ? 'not-allowed' : 'pointer'}
          disabled={disabled}
        >
          <PMHStack gap={3} align="center" width="full">
            <PMAccordion.ItemIndicator />
            <PMText>{title}</PMText>
            {status && (
              <PMBox marginLeft="auto">
                {renderStatusBadge(status, statusTooltip, statusMenuActions)}
              </PMBox>
            )}
          </PMHStack>
        </PMAccordion.ItemTrigger>
        {!disabled && (
          <PMAccordion.ItemContent>{children}</PMAccordion.ItemContent>
        )}
      </PMAccordion.Item>
    </PMAccordion.Root>
  );
};
