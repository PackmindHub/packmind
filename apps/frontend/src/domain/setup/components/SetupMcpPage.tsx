import React, { useState, useCallback, useMemo } from 'react';
import {
  PMPage,
  PMPageSection,
  PMVStack,
  PMText,
  PMSpinner,
  PMAlert,
  PMGrid,
} from '@packmind/ui';
import { AgentCard } from '../../accounts/components/McpConfig/AgentCard';
import { AgentModal } from '../../accounts/components/McpConfig/AgentModal';
import { getAgentsConfig } from '../../accounts/components/McpConfig/agentsConfig';
import { IAgentConfig } from '../../accounts/components/McpConfig/types';
import { useMcpConnection } from '../../accounts/components/LocalEnvironmentSetup/hooks';

export const SetupMcpPage: React.FC = () => {
  const { url, token, isLoading, isReady, isError, errorMessage } =
    useMcpConnection();
  const [selectedAgent, setSelectedAgent] = useState<IAgentConfig | null>(null);

  const handleAgentClick = useCallback(
    (agent: IAgentConfig) => () => setSelectedAgent(agent),
    [],
  );

  const handleCloseModal = useCallback(() => setSelectedAgent(null), []);

  const agentsConfig = useMemo(() => getAgentsConfig(), []);

  return (
    <PMPage
      title="MCP Servers"
      subtitle="Configure MCP servers to connect your AI assistants to Packmind."
    >
      <PMVStack gap={6} width="full">
        <PMPageSection title="Connect your AI tool" variant="outline">
          <PMVStack align="flex-start" gap={4} width="full">
            <PMText color="tertiary" mb={2}>
              Select the AI assistant you want to connect to Packmind via MCP.
            </PMText>

            {isLoading && (
              <PMVStack alignItems="center" gap={4} py={8} width="full">
                <PMSpinner size="lg" />
                <PMText as="p" fontSize="sm" color="faded">
                  Generating access token...
                </PMText>
              </PMVStack>
            )}

            {isError && errorMessage && (
              <PMAlert.Root status="error">
                <PMAlert.Indicator />
                <PMAlert.Content>
                  <PMAlert.Title>Error!</PMAlert.Title>
                  <PMAlert.Description>{errorMessage}</PMAlert.Description>
                </PMAlert.Content>
              </PMAlert.Root>
            )}

            {isReady && (
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
        </PMPageSection>
      </PMVStack>
    </PMPage>
  );
};
