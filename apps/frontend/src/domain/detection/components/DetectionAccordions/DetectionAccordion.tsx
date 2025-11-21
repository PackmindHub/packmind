import React from 'react';
import {
  PMAccordion,
  PMBox,
  PMHStack,
  PMText,
  PMBadge,
  PMTooltip,
} from '@packmind/ui';

export enum DetectionAccordionStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  IN_PROGRESS = 'IN_PROGRESS',
}

interface StatusTooltipData {
  version?: number;
  createdAt?: Date;
}

interface DetectionAccordionProps {
  title: string;
  status?: DetectionAccordionStatus;
  statusTooltip?: StatusTooltipData;
  defaultOpen?: boolean;
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
) => {
  switch (status) {
    case DetectionAccordionStatus.SUCCESS: {
      const badge = (
        <PMBadge colorPalette="green" variant="solid">
          Active
        </PMBadge>
      );

      if (tooltipData && (tooltipData.version || tooltipData.createdAt)) {
        const tooltipLines = ['Information'];
        if (tooltipData.version) {
          tooltipLines.push(`Version: ${tooltipData.version}`);
        }
        if (tooltipData.createdAt) {
          tooltipLines.push(
            `Generation details: ${formatDate(tooltipData.createdAt)}`,
          );
        }

        return (
          <PMTooltip label={tooltipLines.join('\n')} placement="top">
            {badge}
          </PMTooltip>
        );
      }
      return badge;
    }

    case DetectionAccordionStatus.FAILED:
      return (
        <PMBadge colorPalette="red" variant="solid">
          Failed
        </PMBadge>
      );
    case DetectionAccordionStatus.IN_PROGRESS:
      return (
        <PMBadge colorPalette="blue" variant="solid">
          In progress
        </PMBadge>
      );
  }
};

export const DetectionAccordion: React.FC<DetectionAccordionProps> = ({
  title,
  status,
  statusTooltip,
  defaultOpen = false,
  disabled = false,
  children,
}) => {
  const accordionValue = 'content';

  return (
    <PMAccordion.Root
      defaultValue={defaultOpen && !disabled ? [accordionValue] : []}
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
                {renderStatusBadge(status, statusTooltip)}
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
