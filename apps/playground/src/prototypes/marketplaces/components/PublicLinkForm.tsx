import { type ChangeEvent } from 'react';
import {
  PMBox,
  PMHStack,
  PMIcon,
  PMInput,
  PMText,
  PMVStack,
} from '@packmind/ui';
import {
  LuCheck,
  LuCircleAlert,
  LuGitBranch,
  LuGlobe,
  LuLoaderCircle,
} from 'react-icons/lu';
import type { Agent, PublicValidation } from '../types';
import { AgentsFieldset, FieldShell } from './AgentsFieldset';

type PublicLinkFormProps = {
  url: string;
  onUrlChange: (value: string) => void;
  onUrlValidate: () => void;
  validation: PublicValidation;
  name: string;
  onNameChange: (value: string) => void;
  agents: Agent[];
  onAgentToggle: (agent: Agent, checked: boolean) => void;
};

export function PublicLinkForm({
  url,
  onUrlChange,
  onUrlValidate,
  validation,
  name,
  onNameChange,
  agents,
  onAgentToggle,
}: Readonly<PublicLinkFormProps>) {
  const isError = validation.kind === 'error';
  const isVerified = validation.kind === 'verified';

  return (
    <PMVStack gap={4} align="stretch">
      <FieldShell
        label="Repository URL"
        helper={
          isVerified
            ? undefined
            : 'Paste an HTTPS or SSH URL. We check the repo is publicly readable.'
        }
      >
        <PMBox position="relative">
          <PMInput
            placeholder="https://github.com/org/repo or git@github.com:org/repo.git"
            value={url}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onUrlChange(e.target.value)
            }
            onBlur={onUrlValidate}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onUrlValidate();
              }
            }}
            size="sm"
            borderColor={isError ? 'red.500' : undefined}
            fontFamily="mono"
            fontSize="xs"
            paddingRight={validation.kind === 'checking' ? '32px' : undefined}
          />
          {validation.kind === 'checking' && (
            <PMBox
              position="absolute"
              right="10px"
              top="50%"
              transform="translateY(-50%)"
              color="faded"
              display="flex"
              alignItems="center"
              animation="spin 1s linear infinite"
            >
              <PMIcon fontSize="sm">
                <LuLoaderCircle />
              </PMIcon>
            </PMBox>
          )}
        </PMBox>

        <ValidationHelper validation={validation} />
      </FieldShell>

      {isVerified && (
        <>
          <FieldShell
            label="Display name"
            helper="How this marketplace appears in Packmind."
          >
            <PMInput
              placeholder="e.g. Community OSS playbook"
              value={name}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onNameChange(e.target.value)
              }
              size="sm"
            />
          </FieldShell>

          <FieldShell
            label="Render packages for"
            helper="Each agent gets its native file format on publish."
          >
            <AgentsFieldset agents={agents} onToggle={onAgentToggle} />
          </FieldShell>
        </>
      )}
    </PMVStack>
  );
}

function ValidationHelper({
  validation,
}: Readonly<{ validation: PublicValidation }>) {
  if (validation.kind === 'idle') return null;

  if (validation.kind === 'checking') {
    return (
      <PMText fontSize="xs" color="faded">
        Checking access…
      </PMText>
    );
  }

  if (validation.kind === 'verified') {
    return (
      <PMHStack
        gap={2}
        paddingX={2.5}
        paddingY={2}
        bg="green.900"
        borderWidth="1px"
        borderColor="green.700"
        borderRadius="sm"
        align="center"
      >
        <PMIcon fontSize="sm" color="green.400">
          <LuCheck />
        </PMIcon>
        <PMHStack gap={1.5} align="center" flex={1} minW={0}>
          <PMIcon fontSize="xs" color="green.200">
            <LuGitBranch />
          </PMIcon>
          <PMBox
            as="span"
            fontSize="xs"
            fontFamily="mono"
            color="green.100"
            fontWeight="medium"
            overflow="hidden"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
          >
            {validation.repoPath}
          </PMBox>
          <PMBox as="span" fontSize="10px" color="green.200">
            ·
          </PMBox>
          <PMHStack gap={1} align="center">
            <PMIcon fontSize="10px" color="green.200">
              <LuGlobe />
            </PMIcon>
            <PMBox as="span" fontSize="10px" color="green.200">
              public
            </PMBox>
          </PMHStack>
          <PMBox as="span" fontSize="10px" color="green.200">
            ·
          </PMBox>
          <PMBox as="span" fontSize="10px" color="green.200">
            {validation.defaultBranch}
          </PMBox>
        </PMHStack>
      </PMHStack>
    );
  }

  const reason = validation.reason;
  const message =
    reason === 'not-public'
      ? "This repo isn't publicly readable. Switch to Private to link it via your Git provider, or run the CLI locally."
      : reason === 'not-found'
        ? "We couldn't find this repo. Check the URL and try again."
        : 'This URL doesn’t look like a Git repo. Use HTTPS or SSH (e.g. git@github.com:org/repo.git).';

  return (
    <PMHStack gap={2} align="start">
      <PMIcon fontSize="sm" color="red.400" marginTop={0.5}>
        <LuCircleAlert />
      </PMIcon>
      <PMBox as="span" fontSize="xs" color="red.300" lineHeight={1.5}>
        {message}
      </PMBox>
    </PMHStack>
  );
}
