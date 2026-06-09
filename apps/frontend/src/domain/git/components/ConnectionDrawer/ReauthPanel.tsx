import React from 'react';
import {
  PMAlert,
  PMBox,
  PMField,
  PMHStack,
  PMIcon,
  PMInput,
  PMSpinner,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { LuCircleCheck, LuKeyRound, LuTriangleAlert } from 'react-icons/lu';
import { GitProviderUI } from '../../types/GitProviderTypes';
import { OrganizationId } from '@packmind/types';
import { GitHubAppInstallSlot } from '../ManageGitProvider/GitHubAppConnection';
import { ReauthDraft } from './types';

export interface ReauthPanelProps {
  provider: GitProviderUI;
  organizationId: OrganizationId;
  draft: ReauthDraft;
  onDraftChange: (next: ReauthDraft) => void;
  onSubmitPat: () => void;
}

export const ReauthPanel: React.FC<ReauthPanelProps> = ({
  provider,
  organizationId,
  draft,
  onDraftChange,
  onSubmitPat,
}) => {
  const usesApp = provider.source === 'github' && provider.authMethod === 'app';

  return (
    <PMVStack gap={3} align="stretch">
      <PMHStack justify="space-between" align="baseline">
        <PMText
          fontSize="xs"
          color="faded"
          textTransform="uppercase"
          letterSpacing="wider"
          fontWeight="semibold"
        >
          Re-authenticate
        </PMText>
        <PMText fontSize="xs" color="faded">
          {usesApp ? 'GitHub App' : 'Personal access token'}
        </PMText>
      </PMHStack>

      {usesApp ? (
        <AppReauth provider={provider} organizationId={organizationId} />
      ) : (
        <PatReauth
          provider={provider}
          draft={draft}
          onDraftChange={onDraftChange}
          onSubmit={onSubmitPat}
        />
      )}
    </PMVStack>
  );
};

interface PatReauthProps {
  provider: GitProviderUI;
  draft: ReauthDraft;
  onDraftChange: (next: ReauthDraft) => void;
  onSubmit: () => void;
}

const PatReauth: React.FC<PatReauthProps> = ({
  provider,
  draft,
  onDraftChange,
  onSubmit,
}) => {
  const instanceHost = useInstanceHost(provider.url);
  const isValidating = draft.status === 'validating';
  const isSuccess = draft.status === 'success';
  const hasError = draft.status === 'error';
  const disabled = !draft.patValue.trim() || isValidating || isSuccess;

  return (
    <PMVStack gap={3} align="stretch">
      <PMField.Root invalid={hasError}>
        <PMField.Label>
          <PMHStack gap={1.5} align="center">
            <PMIcon fontSize="xs" color="text.faded">
              <LuKeyRound />
            </PMIcon>
            <PMText fontSize="xs" color="secondary" fontWeight="medium">
              New personal access token
            </PMText>
          </PMHStack>
        </PMField.Label>
        <PMInput
          size="sm"
          type="password"
          autoComplete="off"
          autoFocus
          value={draft.patValue}
          placeholder={
            provider.source === 'gitlab'
              ? 'glpat-xxxxxxxxxxxxxxxxxxxx'
              : 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
          }
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onDraftChange({
              ...draft,
              patValue: e.target.value,
              status: draft.status === 'error' ? 'idle' : draft.status,
              errorMessage: null,
            })
          }
          disabled={isValidating || isSuccess}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'Enter' && !disabled) onSubmit();
          }}
          maxLength={150}
          data-testid="reauth-pat-input"
        />
        <PMField.HelperText>
          Validated against{' '}
          <PMText as="span" fontWeight="medium" color="primary">
            {instanceHost}
          </PMText>
          ; replaces the previous token on success.
        </PMField.HelperText>
      </PMField.Root>

      {isValidating && (
        <PMHStack gap={2} align="center" paddingX={1}>
          <PMSpinner size="xs" />
          <PMText fontSize="xs" color="secondary">
            Checking token against {instanceHost}…
          </PMText>
        </PMHStack>
      )}

      {isSuccess && (
        <PMHStack
          gap={2}
          align="flex-start"
          paddingX={3}
          paddingY={2.5}
          borderRadius="md"
          bg="background.secondary"
          borderWidth="1px"
          borderColor="border.tertiary"
        >
          <PMIcon fontSize="sm" color="success">
            <LuCircleCheck />
          </PMIcon>
          <PMVStack gap={0.5} align="start" flex={1}>
            <PMText fontSize="xs" color="success" fontWeight="medium">
              Token accepted.
            </PMText>
            <PMText fontSize="xs" color="secondary">
              Publishing is restored.
            </PMText>
          </PMVStack>
        </PMHStack>
      )}

      {hasError && (
        <PMAlert.Root status="error">
          <PMAlert.Indicator />
          <PMAlert.Description>{draft.errorMessage}</PMAlert.Description>
        </PMAlert.Root>
      )}

      <PMText fontSize="2xs" color="faded">
        {provider.source === 'github'
          ? 'Needs scopes: repo (read/write), workflow.'
          : 'Needs scopes: api, read_repository, write_repository.'}
      </PMText>
    </PMVStack>
  );
};

interface AppReauthProps {
  provider: GitProviderUI;
  organizationId: OrganizationId;
}

const AppReauth: React.FC<AppReauthProps> = ({ provider, organizationId }) => {
  return (
    <PMVStack gap={3} align="stretch">
      <PMBox
        borderWidth="1px"
        borderColor="border.tertiary"
        borderRadius="md"
        padding={4}
        bg="background.secondary"
      >
        <PMVStack gap={3} align="stretch">
          <PMText fontSize="sm" color="primary" fontWeight="medium">
            Re-install the Packmind GitHub App
          </PMText>
          <PMText fontSize="xs" color="secondary">
            Takes you to GitHub so you can confirm or re-grant the install on{' '}
            <PMText as="span" fontWeight="medium" color="primary">
              {provider.url}
            </PMText>
            . Repo access is reconfigured there; this connection picks the new
            install up automatically.
          </PMText>
          <GitHubAppInstallSlot
            organizationId={organizationId}
            editingProvider={provider}
          />
        </PMVStack>
      </PMBox>
      <PMHStack gap={2} align="flex-start">
        <PMIcon fontSize="xs" color="text.faded" mt={0.5}>
          <LuTriangleAlert />
        </PMIcon>
        <PMText fontSize="2xs" color="faded">
          Re-installing keeps your tracked repository list; you can still remove
          individual repos afterward.
        </PMText>
      </PMHStack>
    </PMVStack>
  );
};

function useInstanceHost(url: string | null): string {
  if (!url) return 'the provider';
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
