import React, { useState } from 'react';
import {
  PMButton,
  PMText,
  PMVStack,
  PMHStack,
  PMAlert,
  PMField,
  PMTabs,
  isFeatureFlagEnabled,
  CLI_LOGIN_COMMAND_FEATURE_KEY,
  DEFAULT_FEATURE_DOMAIN_MAP,
} from '@packmind/ui';
import {
  useGetCurrentApiKeyQuery,
  useGenerateApiKeyMutation,
} from '../api/queries/AuthQueries';
import {
  CopiableTextarea,
  CopiableTextField,
} from '../../../shared/components/inputs';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { UserId } from '@packmind/types';

const DEFAULT_HOST = 'https://app.packmind.ai';

const buildCliLoginCommand = () => {
  const currentHost = window.location.origin;
  const isDefaultHost = currentHost === DEFAULT_HOST;
  const hostFlag = isDefaultHost ? '' : ` --host ${currentHost}`;
  return `packmind-cli login${hostFlag}`;
};

const formatExpirationDate = (expiresAt?: string | Date) => {
  if (!expiresAt) return 'Unknown';
  try {
    const date = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString();
  } catch {
    return 'Invalid date';
  }
};

export const CliAuthentication: React.FunctionComponent = () => {
  const { user } = useAuthContext();
  const [showConfirmGenerate, setShowConfirmGenerate] = useState(false);
  const getCurrentApiKeyQuery = useGetCurrentApiKeyQuery({
    userId: user?.id || ('' as UserId),
  });
  const generateApiKeyMutation = useGenerateApiKeyMutation();

  if (!user) {
    return null;
  }

  const handleGenerateApiKey = () => {
    if (getCurrentApiKeyQuery.data?.hasApiKey && !showConfirmGenerate) {
      setShowConfirmGenerate(true);
      return;
    }

    generateApiKeyMutation.mutate({});
    setShowConfirmGenerate(false);
  };

  const handleCancelGenerate = () => {
    setShowConfirmGenerate(false);
  };

  const loginCommandTab = (
    <PMVStack width="full" alignItems="stretch" gap={4} paddingY={4}>
      <PMText as="p">
        Run this command in your terminal to authenticate with Packmind CLI.
        This will open your browser to complete the login.
      </PMText>
      <CopiableTextField value={buildCliLoginCommand()} readOnly />
      <PMText variant="small" color="tertiary">
        The CLI will automatically receive an API key that expires after 3
        months.
      </PMText>
    </PMVStack>
  );

  const envVarTab = (
    <PMVStack width="full" alignItems="stretch" gap={4} paddingY={4}>
      <PMText as="p">
        Generate an API key to use as an environment variable. It will expire
        after 3 months.
      </PMText>

      {getCurrentApiKeyQuery.data?.hasApiKey && (
        <PMAlert.Root status="info">
          <PMAlert.Indicator />
          <PMAlert.Title>Active API Key</PMAlert.Title>
          <PMAlert.Description>
            You have an active API key that expires on{' '}
            {formatExpirationDate(getCurrentApiKeyQuery.data.expiresAt)}
          </PMAlert.Description>
        </PMAlert.Root>
      )}

      {showConfirmGenerate ? (
        <PMVStack gap={3}>
          <PMAlert.Root status="warning">
            <PMAlert.Indicator />
            <PMAlert.Title>Replace Existing API Key?</PMAlert.Title>
            <PMAlert.Description>
              This will invalidate your current API key. Any applications using
              the old key will need to be updated.
            </PMAlert.Description>
          </PMAlert.Root>

          <PMHStack gap={2}>
            <PMButton
              onClick={handleGenerateApiKey}
              disabled={generateApiKeyMutation.isPending}
            >
              {generateApiKeyMutation.isPending
                ? 'Generating...'
                : 'Yes, Generate New Key'}
            </PMButton>
            <PMButton
              variant="outline"
              onClick={handleCancelGenerate}
              disabled={generateApiKeyMutation.isPending}
            >
              Cancel
            </PMButton>
          </PMHStack>
        </PMVStack>
      ) : (
        <PMButton
          onClick={handleGenerateApiKey}
          disabled={generateApiKeyMutation.isPending}
        >
          {generateApiKeyMutation.isPending
            ? 'Generating...'
            : getCurrentApiKeyQuery.data?.hasApiKey
              ? 'Generate New API Key'
              : 'Generate API Key'}
        </PMButton>
      )}

      {generateApiKeyMutation.isError && (
        <PMAlert.Root status="error">
          <PMAlert.Indicator />
          <PMAlert.Title>Error Generating API Key</PMAlert.Title>
          <PMAlert.Description>
            {generateApiKeyMutation.error instanceof Error
              ? generateApiKeyMutation.error.message
              : 'Failed to generate API key. Please try again.'}
          </PMAlert.Description>
        </PMAlert.Root>
      )}

      {generateApiKeyMutation.isSuccess && generateApiKeyMutation.data && (
        <PMVStack width="full" gap={3} alignItems={'stretch'}>
          <PMAlert.Root status="success">
            <PMAlert.Indicator />
            <PMAlert.Title>API Key Generated Successfully!</PMAlert.Title>
            <PMAlert.Description>
              Copy this key now - it won't be shown again. Expires on{' '}
              {formatExpirationDate(generateApiKeyMutation.data.expiresAt)}
            </PMAlert.Description>
          </PMAlert.Root>

          <PMField.Root>
            <PMField.Label>Your API Key</PMField.Label>
            <CopiableTextarea
              value={generateApiKeyMutation.data.apiKey}
              readOnly
              rows={4}
              data-testid="generated-api-key"
              width={'full'}
            />
          </PMField.Root>
        </PMVStack>
      )}
    </PMVStack>
  );

  const showLoginCommandTab = isFeatureFlagEnabled({
    featureKeys: [CLI_LOGIN_COMMAND_FEATURE_KEY],
    featureDomainMap: DEFAULT_FEATURE_DOMAIN_MAP,
    userEmail: user.email,
  });

  const tabs = [
    ...(showLoginCommandTab
      ? [
          {
            value: 'login-command',
            triggerLabel: 'Login Command',
            content: loginCommandTab,
          },
        ]
      : []),
    {
      value: 'env-var',
      triggerLabel: 'Environment Variable',
      content: envVarTab,
    },
  ];

  return (
    <PMTabs
      defaultValue={showLoginCommandTab ? 'login-command' : 'env-var'}
      tabs={tabs}
    />
  );
};
