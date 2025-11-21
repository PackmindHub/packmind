import React from 'react';
import { PMAccordion, PMBox, PMHStack, PMText, PMBadge } from '@packmind/ui';

export enum DetectionAccordionStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  IN_PROGRESS = 'IN_PROGRESS',
}

interface DetectionAccordionProps {
  title: string;
  status?: DetectionAccordionStatus;
  defaultOpen?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}

const renderStatusBadge = (status: DetectionAccordionStatus) => {
  switch (status) {
    case DetectionAccordionStatus.SUCCESS:
      return (
        <PMBadge colorPalette="green" variant="solid">
          Active
        </PMBadge>
      );
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
              <PMBox marginLeft="auto">{renderStatusBadge(status)}</PMBox>
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
