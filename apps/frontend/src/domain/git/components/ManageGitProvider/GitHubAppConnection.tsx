import React, { useState, useEffect, useCallback } from 'react';
import {
  PMAlert,
  PMButton,
  PMField,
  PMVStack,
  PMText,
  PMInput,
} from '@packmind/ui';
import { OrganizationId } from '@packmind/types';
import { useQueryClient } from '@tanstack/react-query';
import { useGetMeQuery } from '../../../accounts/api/queries/UserQueries';
import { useGithubAppInstallUrlMutation } from '../../api/queries/GitProviderQueries';
import { GET_GIT_PROVIDERS_KEY } from '../../api/queryKeys';
import {
  CreateGitProviderForm,
  GitProviderUI,
} from '../../types/GitProviderTypes';

interface GitHubAppConnectionProps {
  organizationId: OrganizationId;
  url: string;
  editingProvider?: GitProviderUI | null;
  isSubmitting: boolean;
  onSubmit: (payload: CreateGitProviderForm) => Promise<void>;
}

type AppInstalledMessage = {
  type: 'packmind:github-app-installed';
  providerId: string;
  orgId: string;
};

export const GitHubAppCloudInstallSlot: React.FC<{
  organizationId: OrganizationId;
  url: string;
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
    const { installUrl, state } = await installUrlMutation.mutateAsync();
    try {
      window.localStorage.setItem(`pm.gh-app.state.${organizationId}`, state);
    } catch {
      // Private mode or storage full — surface a non-blocking warning
      // but still attempt the popup. The callback route will show an
      // error if state is missing.
    }
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

export const GitHubAppConnection: React.FC<GitHubAppConnectionProps> = ({
  organizationId,
  url,
  isSubmitting,
  onSubmit,
}) => {
  const { data: me } = useGetMeQuery();
  // Defensive fallback: if /me is older and doesn't return edition, behave as OSS.
  const edition: 'cloud' | 'oss' = me?.edition ?? 'oss';

  const [appForm, setAppForm] = useState({
    appInstallationId: '',
  });

  const [appErrors, setAppErrors] = useState<{
    appInstallationId?: string;
  }>({});

  const handleFieldChange = (field: keyof typeof appForm, value: string) => {
    setAppForm((prev) => ({ ...prev, [field]: value }));
    if (appErrors[field]) {
      setAppErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleAppSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof appErrors = {};
    const instIdNum = Number(appForm.appInstallationId);
    if (
      !appForm.appInstallationId.trim() ||
      !Number.isInteger(instIdNum) ||
      instIdNum <= 0
    ) {
      errs.appInstallationId = 'Installation ID must be a positive integer';
    }
    setAppErrors(errs);
    if (Object.keys(errs).length > 0) return;

    await onSubmit({
      source: 'github',
      url,
      token: '', // not used for app method; backend ignores it
      authMethod: 'app',
      appInstallationId: instIdNum,
    });
  };

  if (edition === 'cloud') {
    return (
      <GitHubAppCloudInstallSlot organizationId={organizationId} url={url} />
    );
  }

  const installationIdInputId = 'github-app-installation-id';

  const isSubmitDisabled = !appForm.appInstallationId.trim();

  return (
    <form onSubmit={handleAppSubmit}>
      <PMVStack alignItems="stretch" gap={4}>
        <PMField.Root required invalid={!!appErrors.appInstallationId}>
          <PMField.Label htmlFor={installationIdInputId}>
            Installation ID
            <PMField.RequiredIndicator />
          </PMField.Label>
          <PMInput
            id={installationIdInputId}
            size="sm"
            type="number"
            inputMode="numeric"
            min={1}
            value={appForm.appInstallationId}
            onChange={(e) =>
              handleFieldChange('appInstallationId', e.target.value)
            }
            disabled={isSubmitting}
          />
          <PMField.HelperText>
            The installation ID returned after installing the App on your org or
            repo. Visible in the GitHub App's "Install" page URL.
          </PMField.HelperText>
          <PMField.ErrorText>{appErrors.appInstallationId}</PMField.ErrorText>
        </PMField.Root>

        <PMButton
          type="submit"
          size="sm"
          loading={isSubmitting}
          disabled={isSubmitDisabled}
        >
          Save
        </PMButton>
      </PMVStack>
    </form>
  );
};
