import React from 'react';
import { PMCard, PMHStack, PMText, PMVStack, PMBadge } from '@packmind/ui';
import { IAgentConfig, InstallMethodType } from './types';

interface IAgentCardProps {
  agent: IAgentConfig;
  onClick: (event: React.MouseEvent<HTMLDivElement>) => void;
}

const methodLabels: Record<InstallMethodType, string> = {
  cli: 'CLI',
  magicLink: 'Magic Link',
  json: 'JSON',
};

export const AgentCard: React.FunctionComponent<IAgentCardProps> = ({
  agent,
  onClick,
}) => {
  const availableMethods = agent.installMethods
    .filter((method) => method.available)
    .map((method) => method.type);

  return (
    <PMCard.Root
      onClick={onClick}
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
                {methodLabels[methodType]}
              </PMBadge>
            ))}
          </PMHStack>
        </PMVStack>
      </PMCard.Body>
    </PMCard.Root>
  );
};
