import React from 'react';
import { PMTooltip, PMIcon, PMBox } from '@packmind/ui';
import { HiInformationCircle } from 'react-icons/hi2';

interface IConceptTooltipProps {
  concept: 'mcp-server' | 'playbook' | 'standard' | 'command' | 'package';
}

const CONCEPT_DESCRIPTIONS: Record<IConceptTooltipProps['concept'], string> = {
  'mcp-server':
    'The MCP server connects your AI agent to Packmind to access your playbook in real-time',
  playbook:
    'Your playbook = your collection of standards and commands. This is what the AI agent will follow to code your way.',
  standard:
    "A standard = code rules that AI applies automatically (e.g., 'Use assertive test names')",
  command:
    "A command = a step-by-step guide for a repetitive task (e.g., 'Create a new API endpoint')",
  package:
    "A package = a group of standards and commands organized by theme (e.g., 'Backend API', 'Frontend React')",
};

export const ConceptTooltip: React.FC<IConceptTooltipProps> = ({ concept }) => {
  return (
    <PMTooltip
      label={
        <PMBox maxWidth="250px" fontSize="sm">
          {CONCEPT_DESCRIPTIONS[concept]}
        </PMBox>
      }
      placement="top"
      openDelay={200}
    >
      <PMBox
        as="span"
        display="inline-flex"
        alignItems="center"
        ml={1}
        cursor="help"
        color="text.tertiary"
        _hover={{ color: 'primary' }}
        transition="color 0.2s"
      >
        <PMIcon as={HiInformationCircle} size="sm" />
      </PMBox>
    </PMTooltip>
  );
};
