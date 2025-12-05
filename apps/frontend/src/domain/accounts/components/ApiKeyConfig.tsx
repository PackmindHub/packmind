import React, { useState } from 'react';
import {
  PMButton,
  PMPageSection,
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
  useCreateCliLoginCodeMutation,
} from '../api/queries/AuthQueries';
import {
  CopiableTextarea,
  CopiableTextField,
} from '../../../shared/components/inputs';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { UserId } from '@packmind/types';

const DEFAULT_HOST = 'https://app.packmind.ai';

export const ApiKeyConfig: React.FunctionComponent = () => {
  const { user, organization } = useAuthContext();
  const [showConfirmGenerate, setShowConfirmGenerate] = useState(false);
  const getCurrentApiKeyQuery = useGetCurrentApiKeyQuery({
    userId: user?.id || ('' as UserId),
  });
  const generateApiKeyMutation = useGenerateApiKeyMutation();
  const createCliLoginCodeMutation = useCreateCliLoginCodeMutation();

  if (!user || !organization) {
    return;
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

  const formatExpirationDate = (expiresAt?: string | Date) => {
    if (!expiresAt) return 'Unknown';
    try {
      const date = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
      return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString();
    } catch {
      return 'Invalid date';
    }
  };

  const buildCliLoginCommand = () => {
    const currentHost = window.location.origin;
    const isDefaultHost = currentHost === DEFAULT_HOST;
    const hostFlag = isDefaultHost ? '' : ` --host ${currentHost}`;
    return `packmind-cli login${hostFlag}`;
  };

  const buildInstallCommand = (loginCode: string) => {
    const currentHost = window.location.origin;
    const isDefaultHost = currentHost === DEFAULT_HOST;
    const hostExport = isDefaultHost
      ? ''
      : `export PACKMIND_HOST=${currentHost} && \\\n`;
    return `${hostExport}export PACKMIND_LOGIN_CODE=${loginCode} && \\\ncurl --proto '=https' --tlsv1.2 -sSf https://raw.githubusercontent.com/PackmindHub/packmind/main/apps/cli/scripts/install.sh | sh`;
  };

  const handleGenerateInstallCommand = () => {
    createCliLoginCodeMutation.mutate();
  };

  const formatCodeExpiresAt = (expiresAt?: string | Date) => {
    if (!expiresAt) return '';
    try {
      const date = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
      const minutes = Math.ceil((date.getTime() - Date.now()) / 60000);
      if (minutes <= 0) return 'Code expired';
      if (minutes === 1) return 'Code expires in 1 minute';
      return `Code expires in ${minutes} minutes`;
    } catch {
      return '';
    }
  };

  const quickInstallTab = (
    <PMVStack width="full" alignItems="stretch" gap={4}>
      <PMText as="p">
        Generate a one-time install command that downloads the CLI and logs you
        in automatically.
      </PMText>

      {!createCliLoginCodeMutation.isSuccess && (
        <PMButton
          onClick={handleGenerateInstallCommand}
          disabled={createCliLoginCodeMutation.isPending}
        >
          {createCliLoginCodeMutation.isPending
            ? 'Generating...'
            : 'Generate Install Command'}
        </PMButton>
      )}

      {createCliLoginCodeMutation.isError && (
        <PMAlert.Root status="error">
          <PMAlert.Indicator />
          <PMAlert.Title>Error</PMAlert.Title>
          <PMAlert.Description>
            {createCliLoginCodeMutation.error instanceof Error
              ? createCliLoginCodeMutation.error.message
              : 'Failed to generate install command. Please try again.'}
          </PMAlert.Description>
        </PMAlert.Root>
      )}

      {createCliLoginCodeMutation.isSuccess &&
        createCliLoginCodeMutation.data && (
          <PMVStack width="full" gap={3} alignItems={'stretch'}>
            <PMAlert.Root status="success">
              <PMAlert.Indicator />
              <PMAlert.Title>Install Command Ready!</PMAlert.Title>
              <PMAlert.Description>
                Copy and run this command in your terminal. The login code can
                only be used once.
              </PMAlert.Description>
            </PMAlert.Root>

            <PMField.Root>
              <PMField.Label>Install Command</PMField.Label>
              <CopiableTextarea
                value={buildInstallCommand(
                  createCliLoginCodeMutation.data.code,
                )}
                readOnly
                rows={3}
                data-testid="install-command"
                width={'full'}
              />
            </PMField.Root>

            <PMText variant="small" color="tertiary">
              {formatCodeExpiresAt(createCliLoginCodeMutation.data.expiresAt)}
            </PMText>

            <PMButton
              variant="outline"
              onClick={handleGenerateInstallCommand}
              disabled={createCliLoginCodeMutation.isPending}
            >
              Generate New Command
            </PMButton>
          </PMVStack>
        )}
    </PMVStack>
  );

  const loginCommandTab = (
    <PMVStack width="full" alignItems="stretch" gap={4}>
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
    <PMVStack width="full" alignItems="stretch" gap={4}>
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
            value: 'quick-install',
            triggerLabel: 'Quick Install',
            content: quickInstallTab,
          },
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
    <PMPageSection title="CLI Authentication" variant="outline">
      <PMTabs
        defaultValue={showLoginCommandTab ? 'quick-install' : 'env-var'}
        tabs={tabs}
      />
    </PMPageSection>
  );
};
