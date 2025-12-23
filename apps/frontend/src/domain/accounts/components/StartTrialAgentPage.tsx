import React, { useState } from 'react';
import {
  PMAlert,
  PMBox,
  PMVStack,
  PMHeading,
  PMText,
  PMField,
  PMButton,
} from '@packmind/ui';
import { CopiableTextarea } from '../../../shared/components/inputs';
import { IAgentConfig } from './McpConfig/types';
import { MethodContent } from './McpConfig/InstallMethods';
import { trialGateway } from '../api/gateways';
import { StartTrialAgentPageDataTestIds } from '@packmind/frontend';

interface IStartTrialAgentPageProps {
  agentLabel: string;
  agentConfig: IAgentConfig | null;
  token: string;
  mcpUrl: string;
  preferredMethodType: 'magicLink' | 'cli' | 'json';
  preferredMethodLabel?: string;
}

const getPreferredMethod = (
  agentConfig: IAgentConfig,
  preferredType: IStartTrialAgentPageProps['preferredMethodType'],
  preferredLabel?: string,
) => {
  const availableMethods = agentConfig.installMethods.filter(
    (m) => m.available,
  );

  // Try to find the preferred method type with optional label match
  const preferred = availableMethods.find(
    (m) =>
      m.type === preferredType &&
      (!preferredLabel || m.label === preferredLabel),
  );
  if (preferred) return preferred;

  // Fallback to just type match
  const typeMatch = availableMethods.find((m) => m.type === preferredType);
  if (typeMatch) return typeMatch;

  // Fallback to first available method
  return availableMethods[0] ?? null;
};

const PlaybookContent: React.FC = () => (
  <PMVStack align="flex-start" gap={4}>
    <PMField.Root width="full">
      <PMField.Label>
        Prompt: Get started with on-boarding MCP tool
      </PMField.Label>
      <CopiableTextarea
        value="Run the Packmind on-boarding process"
        readOnly
        rows={1}
        width="full"
      />
    </PMField.Root>
  </PMVStack>
);

export const StartTrialAgentPage: React.FC<IStartTrialAgentPageProps> = ({
  agentLabel,
  agentConfig,
  token,
  mcpUrl,
  preferredMethodType,
  preferredMethodLabel,
}) => {
  // Améliore le titre pour l'option "other"
  const getAgentTitle = (label: string) => {
    if (label.trim().toLowerCase() === 'other') {
      return 'Start with your agent';
    }
    return `Start with ${label}`;
  };
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  const method = agentConfig
    ? getPreferredMethod(agentConfig, preferredMethodType, preferredMethodLabel)
    : null;

  const handleCreateAccount = async () => {
    setIsCreatingAccount(true);
    setAccountError(null);

    try {
      const { activationUrl } = await trialGateway.getActivationToken({
        mcpToken: token,
      });
      window.location.href = activationUrl;
    } catch (error) {
      setAccountError(
        error instanceof Error ? error.message : 'Failed to create account',
      );
      setIsCreatingAccount(false);
    }
  };

  return (
    <PMVStack gap={6} align="stretch">
      <PMBox textAlign="center">
        <PMHeading level="h2">{getAgentTitle(agentLabel)}</PMHeading>
        <PMText color="secondary" mt={2}>
          Get up and running in 3 simple steps
        </PMText>
      </PMBox>

      <PMVStack gap={8} align="stretch">
        <PMBox>
          <PMHeading level="h4" mb={4}>
            1 - Connect to Packmind MCP server
          </PMHeading>
          {method && (
            <MethodContent method={method} token={token} url={mcpUrl} />
          )}
        </PMBox>

        <PMBox>
          <PMHeading level="h4" mb={2}>
            2 - Create your playbook
          </PMHeading>
          <PMText as="p" mb={4} color="secondary">
            Create instructions tailored to your project context.
          </PMText>
          <PlaybookContent />
        </PMBox>

        <PMBox>
          <PMHeading level="h4" mb={2}>
            3 - Work with your teammates
          </PMHeading>
          <PMText as="p" mb={4} color="secondary">
            Create your account to collaborate with your team and share your
            playbooks.
          </PMText>
          <PMButton
            onClick={handleCreateAccount}
            loading={isCreatingAccount}
            disabled={isCreatingAccount}
            data-testid={StartTrialAgentPageDataTestIds.CreateAccountButton}
          >
            Create an account
          </PMButton>
          {accountError && (
            <PMAlert.Root status="error" mt={2}>
              <PMAlert.Indicator />
              <PMAlert.Title>{accountError}</PMAlert.Title>
            </PMAlert.Root>
          )}
        </PMBox>
      </PMVStack>
    </PMVStack>
  );
};
