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
