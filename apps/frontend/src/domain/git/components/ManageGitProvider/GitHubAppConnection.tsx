import React, { useState, useEffect, useCallback } from 'react';
import {
  PMAlert,
  PMButton,
  PMVStack,
  PMText,
  PMSkeleton,
  PMDialog,
  PMCloseButton,
  PMPortal,
  PMHStack,
} from '@packmind/ui';
import { OrganizationId } from '@packmind/types';
import { useQueryClient } from '@tanstack/react-query';
import { useGetMeQuery } from '../../../accounts/api/queries/UserQueries';
import {
  useGithubAppInstallUrlMutation,
  useGetGithubAppStatusQuery,
  useGetGithubAppManifestMutation,
  useRevokeGithubAppMutation,
} from '../../api/queries/GitProviderQueries';
import { GET_GIT_PROVIDERS_KEY } from '../../api/queryKeys';

interface GitHubAppConnectionProps {
  organizationId: OrganizationId;
  url: string;
  onClose?: () => void;
}

type AppInstalledMessage = {
  type: 'packmind:github-app-installed';
  providerId: string;
  orgId: string;
};

export const GitHubAppInstallSlot: React.FC<{
  organizationId: OrganizationId;
  onClose?: () => void;
}> = ({ organizationId, onClose }) => {
  const queryClient = useQueryClient();
  const installUrlMutation = useGithubAppInstallUrlMutation();
  const [localError, setLocalError] = useState<string | null>(null);

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
        intent="primary"
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

const ReregisterDialog: React.FC<{
  onConfirm: () => Promise<void>;
  isConfirming: boolean;
}> = ({ onConfirm, isConfirming }) => {
  const [open, setOpen] = useState(false);

  const handleConfirm = async () => {
    await onConfirm();
    setOpen(false);
  };

  return (
    <PMDialog.Root
      open={open}
      onOpenChange={(details: { open: boolean }) => {
        if (!isConfirming) {
          setOpen(details.open);
        }
      }}
      size="md"
      scrollBehavior="inside"
      closeOnInteractOutside={false}
    >
      <PMDialog.Trigger asChild>
        <PMButton variant="tertiary" size="sm" onClick={() => setOpen(true)}>
          Re-register GitHub App
        </PMButton>
      </PMDialog.Trigger>
      <PMPortal>
        <PMDialog.Backdrop />
        <PMDialog.Positioner>
          <PMDialog.Content>
            <PMDialog.Header>
              <PMDialog.Title>Re-register GitHub App</PMDialog.Title>
              <PMDialog.CloseTrigger asChild>
                <PMCloseButton disabled={isConfirming} />
              </PMDialog.CloseTrigger>
            </PMDialog.Header>
            <PMDialog.Body>
              <PMText>
                This will revoke Packmind&apos;s stored credentials for your
                GitHub App. The existing App on GitHub.com will remain — you can
                delete it from GitHub&apos;s settings page if you no longer need
                it. Continue?
              </PMText>
            </PMDialog.Body>
            <PMDialog.Footer>
              <PMHStack gap={3} justifyContent="flex-end">
                <PMDialog.Trigger asChild>
                  <PMButton variant="tertiary" disabled={isConfirming}>
                    Cancel
                  </PMButton>
                </PMDialog.Trigger>
                <PMButton
                  variant="danger"
                  loading={isConfirming}
                  disabled={isConfirming}
                  onClick={handleConfirm}
                >
                  Revoke and Re-register
                </PMButton>
              </PMHStack>
            </PMDialog.Footer>
          </PMDialog.Content>
        </PMDialog.Positioner>
      </PMPortal>
    </PMDialog.Root>
  );
};

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
        intent="primary"
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

const OssAppRegisteredSlot: React.FC<{
  organizationId: OrganizationId;
  onClose?: () => void;
}> = ({ organizationId, onClose }) => {
  const revokeMutation = useRevokeGithubAppMutation();

  const handleRevoke = async () => {
    await revokeMutation.mutateAsync();
  };

  return (
    <PMVStack alignItems="stretch" gap={4}>
      <GitHubAppInstallSlot organizationId={organizationId} onClose={onClose} />
      <ReregisterDialog
        onConfirm={handleRevoke}
        isConfirming={revokeMutation.isPending}
      />
    </PMVStack>
  );
};

export const GitHubAppConnection: React.FC<GitHubAppConnectionProps> = ({
  organizationId,
  onClose,
}) => {
  const { data: me } = useGetMeQuery();
  const edition: 'cloud' | 'oss' = me?.edition ?? 'oss';

  const {
    data: appStatus,
    isLoading: isStatusLoading,
    isError: isStatusError,
    refetch: refetchStatus,
  } = useGetGithubAppStatusQuery();

  if (edition === 'cloud') {
    return (
      <GitHubAppInstallSlot organizationId={organizationId} onClose={onClose} />
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
      <OssAppRegisteredSlot organizationId={organizationId} onClose={onClose} />
    );
  }

  return <OssConnectButton organizationId={organizationId} />;
};
