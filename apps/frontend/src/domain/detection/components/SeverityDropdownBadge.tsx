import { type ComponentType, type FC, type MouseEvent } from 'react';
import { PMButton, PMMenu, PMPortal, PMIcon } from '@packmind/ui';
import type { PMButtonVariants } from '@packmind/ui';
import { LuChevronDown, LuOctagonAlert, LuTriangleAlert } from 'react-icons/lu';
import { DetectionSeverity } from '@packmind/types';

interface SeverityDropdownBadgeProps {
  severity: DetectionSeverity;
  onSeverityChange: (severity: DetectionSeverity) => void;
  isDisabled?: boolean;
}

interface SeverityOptionConfig {
  text: string;
  variant: PMButtonVariants;
  Icon: ComponentType;
  iconColor: string;
}

const SEVERITY_CONFIG: Record<DetectionSeverity, SeverityOptionConfig> = {
  [DetectionSeverity.ERROR]: {
    text: 'Severity: Error',
    variant: 'danger',
    Icon: LuOctagonAlert,
    iconColor: 'red.500',
  },
  [DetectionSeverity.WARNING]: {
    text: 'Severity: Warning',
    variant: 'warning',
    Icon: LuTriangleAlert,
    iconColor: 'yellow.500',
  },
};

const SEVERITY_OPTIONS = [
  { value: DetectionSeverity.ERROR, label: 'Error' },
  { value: DetectionSeverity.WARNING, label: 'Warning' },
];

export const SeverityDropdownBadge: FC<SeverityDropdownBadgeProps> = ({
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
          onClick={(e: MouseEvent) => {
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
            {SEVERITY_OPTIONS.map((option) => {
              const { Icon, iconColor } = SEVERITY_CONFIG[option.value];
              return (
                <PMMenu.Item
                  key={option.value}
                  value={option.value}
                  cursor="pointer"
                  onClick={(e: MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (option.value !== severity) {
                      onSeverityChange(option.value);
                    }
                  }}
                >
                  <PMIcon size="sm" color={iconColor} mr={2}>
                    <Icon />
                  </PMIcon>
                  {option.label}
                </PMMenu.Item>
              );
            })}
          </PMMenu.Content>
        </PMMenu.Positioner>
      </PMPortal>
    </PMMenu.Root>
  );
};
