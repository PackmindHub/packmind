import React from 'react';
import { PMButton, PMMenu, PMPortal, PMIcon } from '@packmind/ui';
import type { PMButtonVariants } from '@packmind/ui';
import { LuChevronDown } from 'react-icons/lu';
import { DetectionSeverity } from '@packmind/types';

interface SeverityDropdownBadgeProps {
  severity: DetectionSeverity;
  onSeverityChange: (severity: DetectionSeverity) => void;
  isDisabled?: boolean;
}

const SEVERITY_CONFIG: Record<
  DetectionSeverity,
  { text: string; variant: PMButtonVariants }
> = {
  [DetectionSeverity.ERROR]: { text: 'Error', variant: 'danger' },
  [DetectionSeverity.WARNING]: { text: 'Warning', variant: 'warning' },
};

const SEVERITY_OPTIONS = [
  { value: DetectionSeverity.ERROR, label: 'Error' },
  { value: DetectionSeverity.WARNING, label: 'Warning' },
];

export const SeverityDropdownBadge: React.FC<SeverityDropdownBadgeProps> = ({
  severity,
  onSeverityChange,
  isDisabled = false,
}) => {
  const config = SEVERITY_CONFIG[severity];

  if (isDisabled) {
    return (
      <PMButton variant={config.variant} size="2xs" disabled>
        {config.text}
      </PMButton>
    );
  }

  return (
    <PMMenu.Root>
      <PMMenu.Trigger asChild>
        <PMButton
          variant={config.variant}
          size="2xs"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
          }}
        >
          {config.text}
          <PMIcon size="xs">
            <LuChevronDown />
          </PMIcon>
        </PMButton>
      </PMMenu.Trigger>
      <PMPortal>
        <PMMenu.Positioner>
          <PMMenu.Content>
            {SEVERITY_OPTIONS.map((option) => (
              <PMMenu.Item
                key={option.value}
                value={option.value}
                cursor="pointer"
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (option.value !== severity) {
                    onSeverityChange(option.value);
                  }
                }}
              >
                {option.label}
              </PMMenu.Item>
            ))}
          </PMMenu.Content>
        </PMMenu.Positioner>
      </PMPortal>
    </PMMenu.Root>
  );
};
