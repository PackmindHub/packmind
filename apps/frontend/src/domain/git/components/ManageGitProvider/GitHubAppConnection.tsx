import React, { useState, useEffect, useCallback } from 'react';
import {
  PMAlert,
  PMButton,
  PMVStack,
  PMText,
  PMSkeleton,
  PMLink,
} from '@packmind/ui';
import { OrganizationId } from '@packmind/types';
import { useQueryClient } from '@tanstack/react-query';
import { useGetMeQuery } from '../../../accounts/api/queries/UserQueries';
import {
  useGithubAppInstallUrlMutation,
  useGetGithubAppStatusQuery,
  useGetGithubAppManifestMutation,
} from '../../api/queries/GitProviderQueries';
import { GET_GIT_PROVIDERS_KEY } from '../../api/queryKeys';
import { GitProviderUI } from '../../types/GitProviderTypes';

interface GitHubAppConnectionProps {
  organizationId: OrganizationId;
  url: string;
  onClose?: () => void;
  editingProvider?: GitProviderUI | null;
}

type AppInstalledMessage = {
  type: 'packmind:github-app-installed';
  providerId: string;
  orgId: string;
};

export const GitHubAppInstallSlot: React.FC<{
  organizationId: OrganizationId;
  onClose?: () => void;
  editingProvider?: GitProviderUI | null;
}> = ({ organizationId, onClose, editingProvider }) => {
  const queryClient = useQueryClient();
  const installUrlMutation = useGithubAppInstallUrlMutation();
  const [localError, setLocalError] = useState<string | null>(null);
  const [viewUrl, setViewUrl] = useState<string | null>(null);

  const isConnectedApp =
    editingProvider?.authMethod === 'app' && editingProvider?.hasAuth === true;

  const handleMessage = useCallback(
    async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as AppInstalledMessage;
      if (
        data?.type !== 'packmind:github-app-installed' ||
        data?.orgId !== organizationId
      )
        return;
      await queryClient.invalidateQueries({ queryKey: GET_GIT_PROVIDERS_KEY });
      onClose?.();
    },
    [organizationId, queryClient, onClose],
  );

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [handleMessage]);

  const { mutateAsync: fetchInstallUrl } = installUrlMutation;
  useEffect(() => {
    if (!isConnectedApp) return;
    let cancelled = false;
    (async () => {
      try {
        const { installUrl } = await fetchInstallUrl();
        if (!cancelled) setViewUrl(installUrl);
      } catch {
        // The mutation already surfaces its error via installUrlMutation.error.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isConnectedApp, fetchInstallUrl]);

  const handleInstallClick = async () => {
    if (!organizationId) return;
    setLocalError(null);
    const { installUrl } = await installUrlMutation.mutateAsync();
    const popup = window.open(
      installUrl,
      'packmind-gh-app',
      'width=900,height=750',
    );
    if (!popup) {
      setLocalError(
        'Popup blocked. Please allow popups for this site and retry.',
      );
    }
  };

  const errorMessage =
    localError ??
    (installUrlMutation.error
      ? (installUrlMutation.error.message ?? 'Failed to get install URL.')
      : null);

  if (isConnectedApp) {
    return (
      <PMVStack alignItems="stretch" gap={4}>
        {errorMessage && (
          <PMAlert.Root status="error">
            <PMAlert.Indicator />
            <PMAlert.Content>
              <PMAlert.Description>{errorMessage}</PMAlert.Description>
            </PMAlert.Content>
          </PMAlert.Root>
        )}
        {viewUrl ? (
          <PMLink
            href={viewUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="underline"
          >
            View Packmind on GitHub
          </PMLink>
        ) : (
          <PMSkeleton h={6} w="60%" rounded="sm" />
        )}
        <PMText variant="small" color="secondary">
          Opens the Packmind app page on GitHub in a new tab.
        </PMText>
      </PMVStack>
    );
  }

  return (
    <PMVStack alignItems="stretch" gap={4}>
      {errorMessage && (
        <PMAlert.Root status="error">
          <PMAlert.Indicator />
          <PMAlert.Content>
            <PMAlert.Description>{errorMessage}</PMAlert.Description>
          </PMAlert.Content>
        </PMAlert.Root>
      )}
      <PMButton
        variant="primary"
        loading={installUrlMutation.isPending}
        disabled={installUrlMutation.isPending}
        onClick={handleInstallClick}
      >
        Install Packmind on GitHub
      </PMButton>
      <PMText variant="small" color="secondary">
        This will open a GitHub install popup.
      </PMText>
    </PMVStack>
  );
};

/**
 * @deprecated Use GitHubAppInstallSlot instead. Kept temporarily for
 * backwards-compatible import resolution during the transition period.
 */
export const GitHubAppCloudInstallSlot = GitHubAppInstallSlot;

const OssConnectButton: React.FC<{
  organizationId: OrganizationId;
}> = ({ organizationId }) => {
  const manifestMutation = useGetGithubAppManifestMutation();
  const [manifestError, setManifestError] = useState<string | null>(null);

  const handleConnectClick = async () => {
    setManifestError(null);
    try {
      const { manifest, state, manifestPostUrl } =
        await manifestMutation.mutateAsync();

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = `${manifestPostUrl}?state=${encodeURIComponent(state)}`;
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'manifest';
      input.value = JSON.stringify(manifest);
      form.appendChild(input);
      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      setManifestError(
        err instanceof Error
          ? err.message
          : 'Failed to initiate GitHub App registration.',
      );
    }
  };

  const errorMessage =
    manifestError ??
    (manifestMutation.error
      ? (manifestMutation.error.message ??
        'Failed to initiate GitHub App registration.')
      : null);

  return (
    <PMVStack alignItems="stretch" gap={4}>
      {errorMessage && (
        <PMAlert.Root status="error">
          <PMAlert.Indicator />
          <PMAlert.Content>
            <PMAlert.Description>{errorMessage}</PMAlert.Description>
          </PMAlert.Content>
        </PMAlert.Root>
      )}
      <PMButton
        variant="primary"
        loading={manifestMutation.isPending}
        disabled={manifestMutation.isPending}
        onClick={handleConnectClick}
      >
        Connect to GitHub
      </PMButton>
      <PMText variant="small" color="secondary">
        This will register a new GitHub App for your organization.
      </PMText>
    </PMVStack>
  );
};

export const GitHubAppConnection: React.FC<GitHubAppConnectionProps> = ({
  organizationId,
  onClose,
  editingProvider,
}) => {
  const { data: me } = useGetMeQuery();
  const githubAppMode: 'on-prem' | 'shared' =
    me?.authenticated && me.organization
      ? me.organization.githubAppMode
      : 'on-prem';

  const {
    data: appStatus,
    isLoading: isStatusLoading,
    isError: isStatusError,
    refetch: refetchStatus,
  } = useGetGithubAppStatusQuery();

  if (githubAppMode === 'shared') {
    return (
      <GitHubAppInstallSlot
        organizationId={organizationId}
        onClose={onClose}
        editingProvider={editingProvider}
      />
    );
  }

  if (isStatusLoading) {
    return (
      <PMVStack alignItems="stretch" gap={3}>
        <PMSkeleton h={10} w="full" rounded="md" />
        <PMSkeleton h={4} w="60%" rounded="sm" />
      </PMVStack>
    );
  }

  if (isStatusError) {
    return (
      <PMVStack alignItems="stretch" gap={4}>
        <PMAlert.Root status="error">
          <PMAlert.Indicator />
          <PMAlert.Content>
            <PMAlert.Description>
              Failed to load GitHub App status.
            </PMAlert.Description>
          </PMAlert.Content>
        </PMAlert.Root>
        <PMButton variant="tertiary" size="sm" onClick={() => refetchStatus()}>
          Retry
        </PMButton>
      </PMVStack>
    );
  }

  if (appStatus?.hasApp) {
    return (
      <GitHubAppInstallSlot
        organizationId={organizationId}
        onClose={onClose}
        editingProvider={editingProvider}
      />
    );
  }

  return <OssConnectButton organizationId={organizationId} />;
};
