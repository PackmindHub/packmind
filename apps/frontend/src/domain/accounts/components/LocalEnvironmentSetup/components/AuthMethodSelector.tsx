import React from 'react';
import { PMHStack, PMRadioCard } from '@packmind/ui';
import { AuthMethod, IAuthMethodSelectorProps } from '../types';

const AUTH_OPTIONS: { value: AuthMethod; label: string }[] = [
  { value: 'login-command', label: 'Login command' },
  { value: 'api-key', label: 'API key' },
];

export const AuthMethodSelector: React.FC<IAuthMethodSelectorProps> = ({
  value,
  onChange,
}) => (
  <PMRadioCard.Root
    size="sm"
    variant="outline"
    orientation="horizontal"
    defaultValue="login-command"
    value={value}
    onValueChange={(e) => onChange(e.value as AuthMethod)}
  >
    <PMHStack gap={2} alignItems="stretch" justify="center">
      {AUTH_OPTIONS.map((option) => (
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
