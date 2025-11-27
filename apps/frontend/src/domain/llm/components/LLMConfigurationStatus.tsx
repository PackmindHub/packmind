import React from 'react';
import {
  PMAlert,
  PMSpinner,
  PMHStack,
  PMText,
  PMButton,
  PMVStack,
} from '@packmind/ui';

export type LLMConfigurationStatusType =
  | 'loading'
  | 'connected'
  | 'failed'
  | 'not_configured';

interface LLMConfigurationStatusProps {
  status: LLMConfigurationStatusType;
  providerName?: string;
  model?: string;
  errorMessage?: string;
  onTestAgain?: () => void;
  isTestingAgain?: boolean;
}

export const LLMConfigurationStatus: React.FC<LLMConfigurationStatusProps> = ({
  status,
  providerName,
  model,
  errorMessage,
  onTestAgain,
  isTestingAgain = false,
}) => {
  if (status === 'loading') {
    return (
      <PMAlert.Root status="info">
        <PMHStack gap={3}>
          <PMSpinner size="sm" />
          <PMText>Checking connection status...</PMText>
        </PMHStack>
      </PMAlert.Root>
    );
  }

  if (status === 'connected') {
    return (
      <PMVStack gap={3} alignItems="stretch">
        <PMAlert.Root status="success">
          <PMAlert.Indicator />
          <PMAlert.Title>Connected</PMAlert.Title>
          <PMAlert.Description>
            Successfully connected to {providerName}
            {model && ` using model ${model}`}
          </PMAlert.Description>
        </PMAlert.Root>
        {onTestAgain && (
          <PMHStack>
            <PMButton
              variant="outline"
              size="sm"
              onClick={onTestAgain}
              disabled={isTestingAgain}
            >
              {isTestingAgain ? 'Testing...' : 'Test Again'}
            </PMButton>
          </PMHStack>
        )}
      </PMVStack>
    );
  }

  if (status === 'failed') {
    return (
      <PMVStack gap={3} alignItems="stretch">
        <PMAlert.Root status="error">
          <PMAlert.Indicator />
          <PMAlert.Title>Connection Failed</PMAlert.Title>
          <PMAlert.Description>
            {errorMessage || 'Failed to connect to the AI provider'}
          </PMAlert.Description>
        </PMAlert.Root>
        {onTestAgain && (
          <PMHStack>
            <PMButton
              variant="outline"
              size="sm"
              onClick={onTestAgain}
              disabled={isTestingAgain}
            >
              {isTestingAgain ? 'Testing...' : 'Test Again'}
            </PMButton>
          </PMHStack>
        )}
      </PMVStack>
    );
  }

  // status === 'not_configured'
  return (
    <PMAlert.Root status="info">
      <PMAlert.Indicator />
      <PMAlert.Title>No Configuration</PMAlert.Title>
      <PMAlert.Description>
        No AI provider has been configured yet. Configure a provider below to
        enable AI features.
      </PMAlert.Description>
    </PMAlert.Root>
  );
};
