import React, { useMemo } from 'react';
import { PMCard, PMHStack, PMText, PMVStack, PMBadge } from '@packmind/ui';
import { useAnalytics } from '@packmind/proprietary/frontend/domain/amplitude/providers/AnalyticsProvider';
import { IAgentConfig, METHOD_LABELS } from './types';

interface IAgentCardProps {
  agent: IAgentConfig;
  onClick: (event: React.MouseEvent<HTMLDivElement>) => void;
}

export const AgentCard: React.FunctionComponent<IAgentCardProps> = ({
  agent,
  onClick,
}) => {
  const analytics = useAnalytics();

  const availableMethods = useMemo(
    () =>
      Array.from(
        new Set(
          agent.installMethods
            .filter((method) => method.available)
            .map((method) => method.type),
        ),
      ),
    [agent.installMethods],
  );

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    analytics.track('mcp_configuration_card_clicked', { agent: agent.name });
    onClick(event);
  };

  return (
    <PMCard.Root
      onClick={handleClick}
      cursor="pointer"
      _hover={{ shadow: 'md', borderColor: 'blue.500' }}
      transition="all 0.2s"
      data-testid={`agent-card-${agent.id}`}
    >
      <PMCard.Body p={4}>
        <PMVStack gap={3} alignItems="flex-start">
          <PMText as="p" fontWeight="bold" fontSize="lg">
            {agent.name}
          </PMText>
          {agent.description && (
            <PMText as="p" fontSize="sm" color="faded">
              {agent.description}
            </PMText>
          )}
          <PMHStack gap={2} flexWrap="wrap">
            {availableMethods.map((methodType) => (
              <PMBadge key={methodType} colorScheme="blue" size="sm">
                {METHOD_LABELS[methodType]}
              </PMBadge>
            ))}
          </PMHStack>
        </PMVStack>
      </PMCard.Body>
    </PMCard.Root>
  );
};
