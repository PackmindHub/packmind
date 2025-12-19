import React from 'react';
import { PMHStack, PMRadioCard } from '@packmind/ui';
import { OsType, IOsRadioSelectorProps } from '../types';

const OS_OPTIONS: { value: OsType; label: string }[] = [
  { value: 'macos-linux', label: 'macOS / Linux' },
  { value: 'windows', label: 'Windows' },
];

export const OsRadioSelector: React.FC<IOsRadioSelectorProps> = ({
  value,
  onChange,
}) => (
  <PMRadioCard.Root
    size="sm"
    variant="outline"
    value={value}
    onValueChange={(e) => onChange(e.value as OsType)}
  >
    <PMRadioCard.Label>Your operating system</PMRadioCard.Label>
    <PMHStack gap={2} alignItems="stretch" justify="center">
      {OS_OPTIONS.map((option) => (
        <PMRadioCard.Item key={option.value} value={option.value}>
          <PMRadioCard.ItemHiddenInput />
          <PMRadioCard.ItemControl>
            <PMRadioCard.ItemText>{option.label}</PMRadioCard.ItemText>
            <PMRadioCard.ItemIndicator />
          </PMRadioCard.ItemControl>
        </PMRadioCard.Item>
      ))}
    </PMHStack>
  </PMRadioCard.Root>
);
