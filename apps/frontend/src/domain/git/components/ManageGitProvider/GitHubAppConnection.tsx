import React, { useState, useEffect } from 'react';
import {
  PMAlert,
  PMButton,
  PMVStack,
  PMText,
  PMSkeleton,
  PMLink,
} from '@packmind/ui';
import { OrganizationId } from '@packmind/types';
import { useGetMeQuery } from '../../../accounts/api/queries/UserQueries';
import {
  useGithubAppInstallUrlMutation,
  useGetGithubAppStatusQuery,
  useGetGithubAppManifestMutation,
} from '../../api/queries/GitProviderQueries';
import { GitProviderUI } from '../../types/GitProviderTypes';
import { redirectTo } from '../../../../shared/utils/navigation';
import {
  GithubAppOrgInput,
  githubOrgForRegistration,
  isGithubOrgValid,
} from '../shared/GithubAppOrgInput';

interface GitHubAppConnectionProps {
  organizationId: OrganizationId;
  url: string;
  editingProvider?: GitProviderUI | null;
}

export const GitHubAppInstallSlot: React.FC<{
  organizationId: OrganizationId;
  editingProvider?: GitProviderUI | null;
}> = ({ organizationId, editingProvider }) => {
  const installUrlMutation = useGithubAppInstallUrlMutation();
  const [viewUrl, setViewUrl] = useState<string | null>(null);

  const isConnectedApp =
    editingProvider?.authMethod === 'app' && editingProvider?.hasAuth === true;

  const editingProviderId = editingProvider?.id;

  const { mutateAsync: fetchInstallUrl } = installUrlMutation;
  useEffect(() => {
    if (!isConnectedApp) return;
    let cancelled = false;
    (async () => {
      try {
        const { installUrl } = await fetchInstallUrl({
          gitProviderId: editingProviderId,
        });
        if (!cancelled) setViewUrl(installUrl);
      } catch {
        // The mutation already surfaces its error via installUrlMutation.error.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isConnectedApp, fetchInstallUrl, editingProviderId]);

  const handleInstallClick = async () => {
    if (!organizationId) return;
    try {
      const { installUrl } = await installUrlMutation.mutateAsync({
        gitProviderId: editingProviderId,
      });
      redirectTo(installUrl);
    } catch {
      // The mutation already surfaces its error via installUrlMutation.error.
    }
  };

  const errorMessage = installUrlMutation.error
    ? (installUrlMutation.error.message ?? 'Failed to get install URL.')
    : null;

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
        This will take you to GitHub to pick the orgs and repos to grant access.
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
  const [githubOrg, setGithubOrg] = useState('');

  const handleConnectClick = async () => {
    setManifestError(null);
    try {
      const { manifest, state, manifestPostUrl } =
        await manifestMutation.mutateAsync({
          githubOrg: githubOrgForRegistration(githubOrg),
        });

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
      <GithubAppOrgInput
        githubOrg={githubOrg}
        onGithubOrgChange={setGithubOrg}
        disabled={manifestMutation.isPending}
      />
      <PMButton
        variant="primary"
        loading={manifestMutation.isPending}
        disabled={manifestMutation.isPending || !isGithubOrgValid(githubOrg)}
        onClick={handleConnectClick}
      >
        Connect to GitHub
      </PMButton>
      <PMText variant="small" color="secondary">
        This will take you to GitHub to register a new GitHub App.
      </PMText>
    </PMVStack>
  );
};

export const GitHubAppConnection: React.FC<GitHubAppConnectionProps> = ({
  organizationId,
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
        editingProvider={editingProvider}
      />
    );
  }

  return <OssConnectButton organizationId={organizationId} />;
};
