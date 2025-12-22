import React from 'react';
import { PMBox, PMVStack, PMHeading, PMText, PMField } from '@packmind/ui';
import { CopiableTextarea } from '../../../shared/components/inputs';
import { IAgentConfig } from './McpConfig/types';
import { MethodContent } from './McpConfig/InstallMethods';

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
  const method = agentConfig
    ? getPreferredMethod(agentConfig, preferredMethodType, preferredMethodLabel)
    : null;

  return (
    <PMVStack gap={6} align="stretch">
      <PMBox textAlign="center">
        <PMHeading level="h2">Start with {agentLabel}</PMHeading>
        <PMText color="secondary" mt={2}>
          Get up and running in 2 simple steps
        </PMText>
      </PMBox>

      <PMVStack gap={8} align="stretch">
        <PMBox>
          <PMHeading level="h4" mb={4}>
            1 - Install
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
      </PMVStack>
    </PMVStack>
  );
};
