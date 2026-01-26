import React from 'react';
import { PMHStack, PMRadioCard } from '@packmind/ui';
import { CliAuthenticationDataTestIds } from '@packmind/frontend';
import { AuthMethod, IAuthMethodSelectorProps } from '../types';

const AUTH_OPTIONS: { value: AuthMethod; label: string; testId: string }[] = [
  {
    value: 'login-command',
    label: 'Login command',
    testId: CliAuthenticationDataTestIds.AuthMethodLoginCommand,
  },
  {
    value: 'api-key',
    label: 'API key',
    testId: CliAuthenticationDataTestIds.AuthMethodApiKey,
  },
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
        <PMRadioCard.Item
          key={option.value}
          value={option.value}
          data-testid={option.testId}
        >
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
