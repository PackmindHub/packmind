import React, { useState, useCallback, useMemo } from 'react';
import { PMVStack, PMText, PMSpinner, PMAlert, PMGrid } from '@packmind/ui';
import { AgentCard } from '../../McpConfig/AgentCard';
import { AgentModal } from '../../McpConfig/AgentModal';
import { getAgentsConfig } from '../../McpConfig/agentsConfig';
import { IAgentConfig } from '../../McpConfig/types';
import { useMcpConnection } from '../hooks';
import { StepHeader } from '../components';

export const ConnectAiStep: React.FC = () => {
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
    <PMVStack align="flex-start" gap={6} width="full" p={4}>
      <StepHeader
        title="Connect your AI tool"
        description="Select the AI assistant you want to connect to Packmind via MCP."
      />

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
  );
};
