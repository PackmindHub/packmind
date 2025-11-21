import React from 'react';
import { PMAccordion } from '@packmind/ui';

interface AccordionSectionProps {
  value: string;
  defaultOpen: boolean;
  triggerContent: React.ReactNode;
  children: React.ReactNode;
  disabled?: boolean;
}

export const AccordionSection: React.FC<AccordionSectionProps> = ({
  value,
  defaultOpen,
  triggerContent,
  children,
  disabled = false,
}) => {
  return (
    <PMAccordion.Root
      defaultValue={defaultOpen && !disabled ? [value] : []}
      collapsible
      backgroundColor={disabled ? 'background.tertiary' : 'background.primary'}
      p="2"
      rounded="md"
      variant="plain"
      disabled={disabled}
      width="full"
    >
      <PMAccordion.Item value={value} disabled={disabled}>
        <PMAccordion.ItemTrigger
          cursor={disabled ? 'not-allowed' : 'pointer'}
          disabled={disabled}
        >
          {triggerContent}
        </PMAccordion.ItemTrigger>
        {!disabled && (
          <PMAccordion.ItemContent>{children}</PMAccordion.ItemContent>
        )}
      </PMAccordion.Item>
    </PMAccordion.Root>
  );
};
