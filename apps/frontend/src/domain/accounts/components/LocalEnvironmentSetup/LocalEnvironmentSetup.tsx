import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  PMTabs,
  PMVStack,
  PMText,
  PMHeading,
  PMHStack,
  PMButton,
  PMRadioCard,
  PMAlert,
  PMGrid,
  PMSpinner,
  PMBox,
} from '@packmind/ui';
import {
  CopiableTextarea,
  CopiableTextField,
} from '../../../../shared/components/inputs';
import { useAuthContext } from '../../hooks/useAuthContext';
import { UserId } from '@packmind/types';
import {
  useCreateCliLoginCodeMutation,
  useGetCurrentApiKeyQuery,
  useGenerateApiKeyMutation,
  useGetMcpTokenMutation,
  useGetMcpURLQuery,
} from '../../api/queries/AuthQueries';
import { CliAuthenticationDataTestIds } from '@packmind/frontend';
import { AgentCard } from '../McpConfig/AgentCard';
import { AgentModal } from '../McpConfig/AgentModal';
import { getAgentsConfig } from '../McpConfig/agentsConfig';
import { IAgentConfig } from '../McpConfig/types';

type OsType = 'macos-linux' | 'windows';
type AuthMethod = 'login-command' | 'api-key';

const detectUserOs = (): OsType => {
  if (typeof navigator !== 'undefined') {
    const userAgent = navigator.userAgent?.toLowerCase() || '';
    if (userAgent.includes('windows')) {
      return 'windows';
    }
  }
  return 'macos-linux';
};

const DEFAULT_HOST = 'https://app.packmind.ai';

const buildNpmInstallCommand = () => 'npm install -g @packmind/cli';

const buildCurlInstallCommand = (loginCode: string) => {
  const currentHost = globalThis.location.origin;
  const isDefaultHost = currentHost === DEFAULT_HOST;
  const hostExport = isDefaultHost
    ? ''
    : `export PACKMIND_HOST=${currentHost}\n`;
  return `export PACKMIND_LOGIN_CODE=${loginCode}\n${hostExport}curl -fsSL https://packmind.sh/install | sh`;
};

const buildCliLoginCommand = () => {
  const currentHost = globalThis.location.origin;
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

// ==================== Step 1: Install CLI ====================

interface IInstallCliStepProps {
  loginCode: string | null;
  isGeneratingCode: boolean;
  codeExpiresAt?: string | Date;
  onRegenerateCode: () => void;
}

const InstallCliStep: React.FC<IInstallCliStepProps> = ({
  loginCode,
  isGeneratingCode,
  codeExpiresAt,
  onRegenerateCode,
}) => {
  const [selectedOs, setSelectedOs] = useState<OsType>(detectUserOs);

  const renderAlternativeInstallContent = () => {
    if (isGeneratingCode) {
      return (
        <PMText as="p" color="tertiary">
          Generating install command...
        </PMText>
      );
    }

    if (!loginCode) {
      return null;
    }

    return (
      <>
        <PMText
          variant="small"
          color="primary"
          as="p"
          style={{
            fontWeight: 'medium',
            marginBottom: '4px',
            display: 'inline-block',
          }}
        >
          Terminal
        </PMText>
        <CopiableTextarea
          value={buildCurlInstallCommand(loginCode)}
          readOnly
          rows={3}
        />
        <PMHStack gap={2} marginTop={2}>
          <PMText variant="small" color="tertiary">
            {formatCodeExpiresAt(codeExpiresAt)}
          </PMText>
          <PMButton variant="tertiary" size="xs" onClick={onRegenerateCode}>
            Regenerate code
          </PMButton>
        </PMHStack>
      </>
    );
  };

  return (
    <PMVStack align="flex-start" gap={6} width="full" padding={4}>
      <PMVStack align="flex-start" gap={2}>
        <PMHeading level="h5">Install the Packmind CLI</PMHeading>
        <PMText as="p" color="tertiary">
          The CLI is required to authenticate and run the MCP server locally.
        </PMText>
      </PMVStack>

      <PMVStack align="flex-start" gap={2} width="full">
        <PMRadioCard.Root
          size="sm"
          variant="outline"
          value={selectedOs}
          onValueChange={(e) => setSelectedOs(e.value as OsType)}
        >
          <PMRadioCard.Label>Your operating system</PMRadioCard.Label>
          <PMHStack gap={2} alignItems={'stretch'} justify={'center'}>
            <PMRadioCard.Item value="macos-linux">
              <PMRadioCard.ItemHiddenInput />
              <PMRadioCard.ItemControl>
                <PMRadioCard.ItemText>macOS / Linux</PMRadioCard.ItemText>
                <PMRadioCard.ItemIndicator />
              </PMRadioCard.ItemControl>
            </PMRadioCard.Item>
            <PMRadioCard.Item value="windows">
              <PMRadioCard.ItemHiddenInput />
              <PMRadioCard.ItemControl>
                <PMRadioCard.ItemText>Windows</PMRadioCard.ItemText>
                <PMRadioCard.ItemIndicator />
              </PMRadioCard.ItemControl>
            </PMRadioCard.Item>
          </PMHStack>
        </PMRadioCard.Root>
      </PMVStack>

      <PMVStack alignItems={'flex-start'} width={'full'}>
        {selectedOs === 'macos-linux' && (
          <PMVStack
            align="flex-start"
            gap={4}
            width="full"
            border={'solid 1px'}
            borderColor={'blue.700'}
            padding={4}
            borderRadius={4}
          >
            <PMVStack align="flex-start" gap={1}>
              <PMHeading level="h6">Guided install</PMHeading>
              <PMText as="p" color="tertiary" variant="small">
                One-line install script (installs the CLI and continues
                automatically).
              </PMText>
            </PMVStack>

            <PMBox width="1/2">{renderAlternativeInstallContent()}</PMBox>
          </PMVStack>
        )}

        <PMVStack
          align="flex-start"
          gap={4}
          width="full"
          border={'solid 1px'}
          borderColor={'border.tertiary'}
          padding={4}
          borderRadius={4}
        >
          <PMVStack align="flex-start" gap={1}>
            <PMHeading level="h6">
              {selectedOs === 'macos-linux' ? 'Alternative' : 'Recommended'}
            </PMHeading>
            <PMText as="p" color="tertiary" variant="small">
              Install via npm (most reliable across environments).
            </PMText>
          </PMVStack>

          <PMBox width="1/4">
            <CopiableTextField
              value={buildNpmInstallCommand()}
              readOnly
              label="Terminal (NPM)"
            />
          </PMBox>
        </PMVStack>
      </PMVStack>
    </PMVStack>
  );
};

// ==================== Step 2: Authenticate ====================

const AuthenticateStep: React.FC = () => {
  const { user } = useAuthContext();
  const [authMethod, setAuthMethod] = useState<AuthMethod>('login-command');
  const [showConfirmGenerate, setShowConfirmGenerate] = useState(false);

  const getCurrentApiKeyQuery = useGetCurrentApiKeyQuery({
    userId: user?.id || ('' as UserId),
  });
  const generateApiKeyMutation = useGenerateApiKeyMutation();

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

  const getGenerateButtonLabel = () => {
    if (generateApiKeyMutation.isPending) {
      return 'Generating...';
    }
    if (getCurrentApiKeyQuery.data?.hasApiKey) {
      return 'Generate New API Key';
    }
    return 'Generate API Key';
  };

  const renderLoginCommandContent = () => (
    <PMVStack
      align="flex-start"
      gap={4}
      width="full"
      border={'solid 1px'}
      borderColor={'border.tertiary'}
      padding={4}
      borderRadius={4}
    >
      <PMVStack align="flex-start" gap={1}>
        <PMHeading level="h6">Login command</PMHeading>
        <PMText as="p" color="tertiary" variant="small">
          Opens your browser to complete login. An API key is stored locally
          (expires after 3 months).
        </PMText>
      </PMVStack>

      <PMBox width="1/2">
        <CopiableTextField
          value={buildCliLoginCommand()}
          readOnly
          label="Terminal"
        />
      </PMBox>
    </PMVStack>
  );

  const renderApiKeyContent = () => (
    <PMVStack
      align="flex-start"
      gap={4}
      width="full"
      border={'solid 1px'}
      borderColor={'border.tertiary'}
      padding={4}
      borderRadius={4}
    >
      <PMVStack align="flex-start" gap={1}>
        <PMHeading level="h6">API key</PMHeading>
        <PMText as="p" color="tertiary" variant="small">
          Generate an API key to use as an environment variable. It will expire
          after 3 months.
        </PMText>
      </PMVStack>

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
          data-testid={CliAuthenticationDataTestIds.GenerateApiKeyCTA}
        >
          {getGenerateButtonLabel()}
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

          <PMBox width="full">
            <PMText
              variant="small"
              color="primary"
              as="p"
              style={{
                fontWeight: 'medium',
                marginBottom: '4px',
                display: 'inline-block',
              }}
            >
              Your API Key
            </PMText>
            <CopiableTextarea
              value={generateApiKeyMutation.data.apiKey}
              readOnly
              rows={4}
              data-testid={CliAuthenticationDataTestIds.ApiKeyInput}
            />
          </PMBox>
        </PMVStack>
      )}
    </PMVStack>
  );

  return (
    <PMVStack align="flex-start" gap={6} width="full" padding={4}>
      <PMVStack align="flex-start" gap={2}>
        <PMHeading level="h5">Authenticate with Packmind</PMHeading>
        <PMText as="p" color="tertiary">
          Choose how you want to authenticate.
        </PMText>
      </PMVStack>

      <PMRadioCard.Root
        size="sm"
        variant="outline"
        orientation="horizontal"
        defaultValue="login-command"
        value={authMethod}
        onValueChange={(e) => setAuthMethod(e.value as AuthMethod)}
      >
        <PMHStack gap={2} alignItems={'stretch'} justify={'center'}>
          <PMRadioCard.Item value="login-command">
            <PMRadioCard.ItemHiddenInput />
            <PMRadioCard.ItemControl>
              <PMRadioCard.ItemText>Login command</PMRadioCard.ItemText>
              <PMRadioCard.ItemIndicator />
            </PMRadioCard.ItemControl>
          </PMRadioCard.Item>
          <PMRadioCard.Item value="api-key">
            <PMRadioCard.ItemHiddenInput />
            <PMRadioCard.ItemControl>
              <PMRadioCard.ItemText>API key</PMRadioCard.ItemText>
              <PMRadioCard.ItemIndicator />
            </PMRadioCard.ItemControl>
          </PMRadioCard.Item>
        </PMHStack>
      </PMRadioCard.Root>

      {authMethod === 'login-command'
        ? renderLoginCommandContent()
        : renderApiKeyContent()}
    </PMVStack>
  );
};

// ==================== Step 3: Connect AI ====================

const ConnectAiStep: React.FC = () => {
  const getMcpTokenMutation = useGetMcpTokenMutation();
  const getMcpURLQuery = useGetMcpURLQuery();
  const [selectedAgent, setSelectedAgent] = useState<IAgentConfig | null>(null);

  useEffect(() => {
    if (!getMcpTokenMutation.data && !getMcpTokenMutation.isPending) {
      getMcpTokenMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAgentClick = useCallback(
    (agent: IAgentConfig) => () => {
      setSelectedAgent(agent);
    },
    [],
  );

  const handleCloseModal = useCallback(() => {
    setSelectedAgent(null);
  }, []);

  const url = getMcpURLQuery.data?.url;
  const token = getMcpTokenMutation.data?.access_token;
  const isTokenReady = getMcpTokenMutation.isSuccess && token && url;

  const agentsConfig = useMemo(() => getAgentsConfig(), []);

  const errorMessage = useMemo(() => {
    if (!getMcpTokenMutation.isError) return null;
    return getMcpTokenMutation.error instanceof Error
      ? getMcpTokenMutation.error.message
      : 'Failed to retrieve MCP access token';
  }, [getMcpTokenMutation.isError, getMcpTokenMutation.error]);

  return (
    <PMVStack align="flex-start" gap={6} width="full" p={4}>
      <PMVStack align="flex-start" gap={2}>
        <PMHeading level="h5">Connect your AI tool</PMHeading>
        <PMText as="p" color="tertiary">
          Select the AI assistant you want to connect to Packmind via MCP.
        </PMText>
      </PMVStack>

      {getMcpTokenMutation.isPending && (
        <PMVStack alignItems="center" gap={4} py={8} width="full">
          <PMSpinner size="lg" />
          <PMText as="p" fontSize="sm" color="faded">
            Generating access token...
          </PMText>
        </PMVStack>
      )}

      {getMcpTokenMutation.isError && errorMessage && (
        <PMAlert.Root status="error">
          <PMAlert.Indicator />
          <PMAlert.Content>
            <PMAlert.Title>Error!</PMAlert.Title>
            <PMAlert.Description>{errorMessage}</PMAlert.Description>
          </PMAlert.Content>
        </PMAlert.Root>
      )}

      {isTokenReady && (
        <PMGrid
          templateColumns={{
            base: '1fr',
            md: 'repeat(2, 1fr)',
            lg: 'repeat(3, 1fr)',
          }}
          gap={4}
          width="100%"
        >
          {agentsConfig.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onClick={handleAgentClick(agent)}
            />
          ))}
        </PMGrid>
      )}

      {selectedAgent && token && url && (
        <AgentModal
          agent={selectedAgent}
          token={token}
          url={url}
          isOpen={true}
          onClose={handleCloseModal}
        />
      )}
    </PMVStack>
  );
};

// ==================== Main Component ====================

export const LocalEnvironmentSetup: React.FC = () => {
  const createCliLoginCodeMutation = useCreateCliLoginCodeMutation();

  useEffect(() => {
    if (
      !createCliLoginCodeMutation.data &&
      !createCliLoginCodeMutation.isPending
    ) {
      createCliLoginCodeMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRegenerateCode = () => {
    createCliLoginCodeMutation.mutate();
  };

  const loginCode = createCliLoginCodeMutation.data?.code || null;
  const codeExpiresAt = createCliLoginCodeMutation.data?.expiresAt;

  const tabs = [
    {
      value: 'install-cli',
      triggerLabel: 'Install CLI',
      content: (
        <PMVStack align="flex-start" gap={4} paddingTop={4}>
          <InstallCliStep
            loginCode={loginCode}
            isGeneratingCode={createCliLoginCodeMutation.isPending}
            codeExpiresAt={codeExpiresAt}
            onRegenerateCode={handleRegenerateCode}
          />
        </PMVStack>
      ),
    },
    {
      value: 'authenticate',
      triggerLabel: 'Authenticate',
      content: (
        <PMVStack align="flex-start" gap={4} paddingTop={4}>
          <AuthenticateStep />
        </PMVStack>
      ),
    },
    {
      value: 'connect-ai',
      triggerLabel: 'Connect AI',
      content: (
        <PMVStack align="flex-start" gap={4} paddingTop={4}>
          <ConnectAiStep />
        </PMVStack>
      ),
    },
  ];

  return <PMTabs defaultValue="install-cli" width="full" tabs={tabs} />;
};
