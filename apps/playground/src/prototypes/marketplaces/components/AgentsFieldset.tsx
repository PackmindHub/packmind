import { PMBox, PMHStack, PMIcon, PMText, PMVStack } from '@packmind/ui';
import { LuCheck } from 'react-icons/lu';
import { SiClaude, SiGithubcopilot } from 'react-icons/si';
import type { Agent } from '../types';
import { AGENT_LABEL } from '../types';

type AgentsFieldsetProps = {
  agents: Agent[];
  onToggle: (agent: Agent, checked: boolean) => void;
};

export function AgentsFieldset({
  agents,
  onToggle,
}: Readonly<AgentsFieldsetProps>) {
  const options: Array<{ id: Agent; icon: React.ReactNode }> = [
    { id: 'Claude Code', icon: <SiClaude /> },
    { id: 'Copilot', icon: <SiGithubcopilot /> },
  ];

  return (
    <PMHStack gap={2}>
      {options.map((o) => {
        const checked = agents.includes(o.id);
        return (
          <PMBox
            key={o.id}
            as="button"
            type="button"
            flex={1}
            onClick={() => onToggle(o.id, !checked)}
            paddingX={3}
            paddingY={2.5}
            bg={checked ? 'background.primary' : 'background.secondary'}
            borderWidth="1px"
            borderColor={checked ? 'branding.primary' : 'border.tertiary'}
            borderRadius="md"
            cursor="pointer"
            textAlign="left"
            transition="border-color 150ms ease-out, background-color 150ms ease-out"
            _hover={
              checked
                ? undefined
                : {
                    borderColor: 'border.secondary',
                    bg: 'background.primary',
                  }
            }
            _focusVisible={{
              outline: '2px solid',
              outlineColor: 'branding.primary',
              outlineOffset: '1px',
            }}
            aria-pressed={checked}
          >
            <PMHStack gap={2.5} align="center">
              <PMBox
                width="14px"
                height="14px"
                borderRadius="sm"
                borderWidth="1px"
                borderColor={checked ? 'branding.primary' : 'border.secondary'}
                bg={checked ? 'branding.primary' : 'transparent'}
                display="flex"
                alignItems="center"
                justifyContent="center"
                flexShrink={0}
              >
                {checked && (
                  <PMIcon fontSize="10px" color="background.primary">
                    <LuCheck />
                  </PMIcon>
                )}
              </PMBox>
              <PMIcon fontSize="sm" color="text.secondary">
                {o.icon}
              </PMIcon>
              <PMText fontSize="sm" color="primary" fontWeight="medium">
                {AGENT_LABEL[o.id]}
              </PMText>
            </PMHStack>
          </PMBox>
        );
      })}
    </PMHStack>
  );
}

type FieldShellProps = {
  label: string;
  helper?: string;
  children: React.ReactNode;
};

export function FieldShell({
  label,
  helper,
  children,
}: Readonly<FieldShellProps>) {
  return (
    <PMVStack gap={1.5} align="stretch">
      <PMText
        fontSize="xs"
        fontWeight="medium"
        color="secondary"
        letterSpacing="0.01em"
      >
        {label}
      </PMText>
      {children}
      {helper && (
        <PMText fontSize="xs" color="faded" lineHeight={1.5}>
          {helper}
        </PMText>
      )}
    </PMVStack>
  );
}
