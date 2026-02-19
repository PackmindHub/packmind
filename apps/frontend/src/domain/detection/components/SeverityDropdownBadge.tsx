import React from 'react';
import { PMBox, PMMenu, PMPortal, PMIcon, PMText } from '@packmind/ui';
import { LuChevronDown } from 'react-icons/lu';
import { DetectionSeverity } from '@packmind/types';

interface SeverityDropdownBadgeProps {
  severity: DetectionSeverity;
  onSeverityChange: (severity: DetectionSeverity) => void;
  isDisabled?: boolean;
}

const SEVERITY_CONFIG: Record<
  DetectionSeverity,
  { colorPalette: 'red' | 'orange' }
> = {
  [DetectionSeverity.ERROR]: { colorPalette: 'red' },
  [DetectionSeverity.WARNING]: { colorPalette: 'orange' },
};

const SEVERITY_OPTIONS = [
  { value: DetectionSeverity.ERROR, label: 'error' },
  { value: DetectionSeverity.WARNING, label: 'warning' },
];

export const SeverityDropdownBadge: React.FC<SeverityDropdownBadgeProps> = ({
  severity,
  onSeverityChange,
  isDisabled = false,
}) => {
  const config = SEVERITY_CONFIG[severity];

  if (isDisabled) {
    return (
      <PMBox
        as="span"
        backgroundColor={`${config.colorPalette}.solid`}
        color="white"
        px={2}
        py={0.5}
        borderRadius="full"
        fontSize="xs"
        fontWeight="small"
        display="inline-flex"
        alignItems="center"
        gap={0.5}
        opacity={0.6}
        cursor="not-allowed"
      >
        {severity}
      </PMBox>
    );
  }

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
          _hover={{ opacity: 0.9 }}
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
          }}
        >
          {severity}
          <PMIcon size="xs">
            <LuChevronDown />
          </PMIcon>
        </PMBox>
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
                <PMBox
                  as="span"
                  display="inline-block"
                  width="8px"
                  height="8px"
                  borderRadius="full"
                  backgroundColor={`${SEVERITY_CONFIG[option.value].colorPalette}.solid`}
                  mr={2}
                />
                <PMText as="span" fontSize="sm">
                  {option.label}
                </PMText>
              </PMMenu.Item>
            ))}
          </PMMenu.Content>
        </PMMenu.Positioner>
      </PMPortal>
    </PMMenu.Root>
  );
};
