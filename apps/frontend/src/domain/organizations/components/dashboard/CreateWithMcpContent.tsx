import React from 'react';
import {
  PMBox,
  PMHStack,
  PMVStack,
  PMText,
  PMHeading,
  PMTextArea,
  PMField,
  PMAlert,
  PMBadge,
  PMIcon,
} from '@packmind/ui';
import { LuServer, LuMessageSquare } from 'react-icons/lu';

import { McpConfig } from '../../../accounts/components/McpConfig';

interface StepCardProps {
  stepNumber: number;
  icon: typeof LuServer;
  title: string;
  description: string;
  colorScheme: 'primary' | 'gray';
  children: React.ReactNode;
}

const StepCard: React.FC<StepCardProps> = ({
  stepNumber,
  icon,
  title,
  description,
  colorScheme,
  children,
}) => (
  <PMBox
    p={6}
    borderRadius="lg"
    borderWidth="1px"
    borderColor="gray.700"
    bg="gray.800"
    transition="all 0.2s"
    _hover={{ borderColor: 'primary', shadow: 'md' }}
  >
    <PMHStack mb={3} gap={3}>
      <PMBadge
        size="lg"
        colorScheme={colorScheme}
        borderRadius="full"
        px={3}
        py={1}
        fontWeight="bold"
      >
        {stepNumber}
      </PMBadge>
      <PMIcon as={icon} size="xl" color="text.faded" />
    </PMHStack>
    <PMHeading level="h4" mb={2}>
      {title}
    </PMHeading>
    <PMText as="p" mb={4} color="secondary">
      {description}
    </PMText>
    {children}
  </PMBox>
);

export const CreateWithMcpContent: React.FC = () => {
  return (
    <PMVStack gap={8} align="stretch">
      <PMBox textAlign="center">
        <PMText color="tertiary">
          Connect your MCP server to capture standards and commands directly
          from your coding assistant.
        </PMText>
      </PMBox>

      <StepCard
        stepNumber={1}
        icon={LuServer}
        title="Configure your MCP server"
        description="The MCP server lets AI coding assistants communicate with Packmind to create and consume data."
        colorScheme="primary"
      >
        <McpConfig />
      </StepCard>

      <StepCard
        stepNumber={2}
        icon={LuMessageSquare}
        title="Prompt your coding assistant"
        description="Use prompts in your coding assistant to create standards and commands."
        colorScheme="gray"
      >
        <PMVStack gap={4}>
          <PMField.Root width="full">
            <PMField.Label>
              Example: create a standard about error handling
            </PMField.Label>
            <PMTextArea
              value="Generate a Packmind Standard describing our error handling in Node.js APIs."
              readOnly
              resize={'none'}
            />
          </PMField.Root>

          <PMField.Root width="full">
            <PMField.Label>
              Example: create a command to refactor a React component
            </PMField.Label>
            <PMTextArea
              value="From the last commit, create a Packmind Command to refactor a React component to use hooks instead of class components."
              readOnly
              resize={'none'}
            />
          </PMField.Root>

          <PMAlert.Root status="info">
            <PMAlert.Indicator />
            <PMAlert.Content>
              You can also create and edit standards from the Standards page.
            </PMAlert.Content>
          </PMAlert.Root>
        </PMVStack>
      </StepCard>
    </PMVStack>
  );
};
