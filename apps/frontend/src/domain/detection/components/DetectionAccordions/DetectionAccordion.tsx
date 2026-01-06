import React from 'react';
import { PMAccordion, PMHStack, PMText } from '@packmind/ui';

interface DetectionAccordionProps {
  title: string;
  actions?: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disabled?: boolean;
  children: React.ReactNode;
}

export const DetectionAccordion: React.FC<DetectionAccordionProps> = ({
  title,
  actions,
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
      paddingTop="2"
      paddingBottom={open ? '6' : '2'}
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
            <PMHStack gap={2} marginLeft="auto">
              {actions}
            </PMHStack>
          </PMHStack>
        </PMAccordion.ItemTrigger>
        {!disabled && (
          <PMAccordion.ItemContent>{children}</PMAccordion.ItemContent>
        )}
      </PMAccordion.Item>
    </PMAccordion.Root>
  );
};
