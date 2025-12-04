import React, { useState } from 'react';
import {
  PMButton,
  PMPageSection,
  PMText,
  PMVStack,
  PMAlert,
  PMGrid,
} from '@packmind/ui';
import {
  useGetMcpTokenMutation,
  useGetMcpURLQuery,
} from '../../api/queries/AuthQueries';
import { getAgentsConfig } from './agentsConfig';
import { AgentCard } from './AgentCard';
import { AgentModal } from './AgentModal';
import { IAgentConfig } from './types';

export const McpConfigRedesigned: React.FunctionComponent = () => {
  const getMcpTokenMutation = useGetMcpTokenMutation();
  const getMcpURLQuery = useGetMcpURLQuery();
  const [selectedAgent, setSelectedAgent] = useState<IAgentConfig | null>(null);

  const handleGetToken = () => {
    getMcpTokenMutation.mutate();
  };

  const handleAgentClick = (agent: IAgentConfig) => () => {
    setSelectedAgent(agent);
  };

  const handleCloseModal = () => {
    setSelectedAgent(null);
  };

  const { url } = getMcpURLQuery.data || {};
  const token = getMcpTokenMutation.data?.access_token;

  const agentsConfig = getAgentsConfig();

  return (
    <PMPageSection title="MCP Access Token" variant="outline">
      <PMText as="p">
        Generate an access token for MCP (Model Context Protocol) integration.
      </PMText>

      <PMButton
        onClick={handleGetToken}
        disabled={getMcpTokenMutation.isPending}
        marginBottom={4}
      >
        {getMcpTokenMutation.isPending
          ? 'Getting Token...'
          : 'Get MCP Access Token'}
      </PMButton>

      {getMcpTokenMutation.isError && (
        <PMAlert.Root status="error" mb={4}>
          <PMAlert.Indicator />
          <PMAlert.Content>
            <PMAlert.Title>Error!</PMAlert.Title>
            <PMAlert.Description>
              {getMcpTokenMutation.error instanceof Error
                ? getMcpTokenMutation.error.message
                : 'Failed to retrieve MCP access token'}
            </PMAlert.Description>
          </PMAlert.Content>
        </PMAlert.Root>
      )}

      {getMcpTokenMutation.isSuccess && token && url && (
        <PMVStack width="100%" alignItems="baseline" gap={4}>
          <PMAlert.Root status="success">
            <PMAlert.Indicator />
            <PMAlert.Title>Token Generated Successfully!</PMAlert.Title>
          </PMAlert.Root>

          <PMText as="p" fontSize="sm" color="faded">
            Select an AI assistant to configure:
          </PMText>

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

          {selectedAgent && (
            <AgentModal
              agent={selectedAgent}
              token={token}
              url={url}
              isOpen={!!selectedAgent}
              onClose={handleCloseModal}
            />
          )}
        </PMVStack>
      )}
    </PMPageSection>
  );
};
