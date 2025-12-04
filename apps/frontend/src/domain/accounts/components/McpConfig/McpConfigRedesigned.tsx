import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  PMPageSection,
  PMText,
  PMVStack,
  PMAlert,
  PMGrid,
  PMSpinner,
} from '@packmind/ui';
import {
  useGetMcpTokenMutation,
  useGetMcpURLQuery,
} from '../../api/queries/AuthQueries';
import { getAgentsConfig } from './agentsConfig';
import { AgentCard } from './AgentCard';
import { AgentModal } from './AgentModal';
import { IAgentConfig } from './types';

const ERROR_MESSAGE = 'Failed to retrieve MCP access token';
const DESCRIPTION_TEXT =
  'Configure your AI assistant to connect to Packmind MCP server.';
const LOADING_TEXT = 'Generating access token...';
const SELECTION_PROMPT = 'Select an AI assistant to configure:';

export const McpConfigRedesigned: React.FunctionComponent = () => {
  const getMcpTokenMutation = useGetMcpTokenMutation();
  const getMcpURLQuery = useGetMcpURLQuery();
  const [selectedAgent, setSelectedAgent] = useState<IAgentConfig | null>(null);

  // Automatically fetch token on mount
  useEffect(() => {
    if (!getMcpTokenMutation.data && !getMcpTokenMutation.isPending) {
      getMcpTokenMutation.mutate();
    }
    // Disable exhaustive-deps as we only want this to run once on mount
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
      : ERROR_MESSAGE;
  }, [getMcpTokenMutation.isError, getMcpTokenMutation.error]);

  return (
    <PMPageSection title="MCP server configuration" variant="outline">
      <PMText as="p" mb={4}>
        {DESCRIPTION_TEXT}
      </PMText>

      {getMcpTokenMutation.isPending && (
        <PMVStack alignItems="center" gap={4} py={8}>
          <PMSpinner size="lg" />
          <PMText as="p" fontSize="sm" color="faded">
            {LOADING_TEXT}
          </PMText>
        </PMVStack>
      )}

      {getMcpTokenMutation.isError && errorMessage && (
        <PMAlert.Root status="error" mb={4}>
          <PMAlert.Indicator />
          <PMAlert.Content>
            <PMAlert.Title>Error!</PMAlert.Title>
            <PMAlert.Description>{errorMessage}</PMAlert.Description>
          </PMAlert.Content>
        </PMAlert.Root>
      )}

      {isTokenReady && (
        <PMVStack width="100%" alignItems="baseline" gap={4}>
          <PMText as="p" fontSize="sm" color="faded">
            {SELECTION_PROMPT}
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
      )}
    </PMPageSection>
  );
};
