import React, { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  PMAlert,
  PMBox,
  PMButton,
  PMHStack,
  PMIcon,
  PMSkeleton,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { LuCheck, LuGithub, LuShieldCheck } from 'react-icons/lu';
import { OrganizationId } from '@packmind/types';
import {
  useGetGithubAppManifestMutation,
  useGetGithubAppStatusQuery,
  useGithubAppInstallUrlMutation,
} from '../../api/queries/GitProviderQueries';
import { GET_GIT_PROVIDERS_KEY } from '../../api/queryKeys';

type GithubAppMode = 'on-prem' | 'shared';

type GitHubAppAuthBlockProps = {
  organizationId: OrganizationId;
  githubAppMode: GithubAppMode;
  onInstalled: () => void;
};

type AppInstalledMessage = {
  type: 'packmind:github-app-installed';
  providerId: string;
  orgId: string;
};

export const GitHubAppAuthBlock: React.FC<GitHubAppAuthBlockProps> = ({
  organizationId,
  githubAppMode,
  onInstalled,
}) => {
  const queryClient = useQueryClient();
  const installUrlMutation = useGithubAppInstallUrlMutation();
  const manifestMutation = useGetGithubAppManifestMutation();
  const [popupError, setPopupError] = useState<string | null>(null);

  const statusQuery = useGetGithubAppStatusQuery();

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
      onInstalled();
    },
    [organizationId, queryClient, onInstalled],
  );

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  const handleInstallClick = async () => {
    setPopupError(null);
    try {
      const { installUrl } = await installUrlMutation.mutateAsync();
      const popup = window.open(
        installUrl,
        'packmind-gh-app',
        'width=900,height=750',
      );
      if (!popup) {
        setPopupError(
          'Popup blocked. Please allow popups for this site and retry.',
        );
      }
    } catch {
      // installUrlMutation.error surfaces below.
    }
  };

  const handleRegisterClick = async () => {
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
    } catch {
      // manifestMutation.error surfaces below.
    }
  };

  const needsRegistration =
    githubAppMode === 'on-prem' && statusQuery.data?.hasApp === false;
  const installError = popupError ?? installUrlMutation.error?.message ?? null;
  const manifestError = manifestMutation.error?.message ?? null;

  return (
    <PMVStack
      gap={3}
      align="stretch"
      borderWidth="1px"
      borderColor="border.tertiary"
      bg="background.secondary"
      borderRadius="md"
      padding={4}
    >
      <PMHStack gap={2} align="center">
        <PMIcon fontSize="sm" color="branding.primary">
          <LuShieldCheck />
        </PMIcon>
        <PMText fontSize="sm" fontWeight="semibold" color="primary">
          Recommended: GitHub App
        </PMText>
      </PMHStack>

      <PMText fontSize="xs" color="secondary">
        Install the Packmind app on the orgs and repos you want to connect.
        Access is scoped per repo and credentials rotate automatically. Most
        teams use this.
      </PMText>

      {githubAppMode === 'on-prem' && statusQuery.isLoading && (
        <PMVStack align="stretch" gap={2}>
          <PMSkeleton h={9} w="full" rounded="md" />
          <PMSkeleton h={3} w="60%" rounded="sm" />
        </PMVStack>
      )}

      {githubAppMode === 'on-prem' && statusQuery.isError && (
        <PMAlert.Root status="error">
          <PMAlert.Indicator />
          <PMAlert.Content>
            <PMAlert.Description>
              Failed to load GitHub App status.
            </PMAlert.Description>
          </PMAlert.Content>
        </PMAlert.Root>
      )}

      {githubAppMode === 'on-prem' && statusQuery.data && (
        <EditionStepIndicator
          registered={statusQuery.data.hasApp === true}
          installing={installUrlMutation.isPending}
        />
      )}

      {!statusQuery.isLoading && !statusQuery.isError && (
        <>
          {needsRegistration ? (
            <PMVStack gap={2} align="stretch">
              {manifestError && (
                <PMAlert.Root status="error">
                  <PMAlert.Indicator />
                  <PMAlert.Content>
                    <PMAlert.Description>{manifestError}</PMAlert.Description>
                  </PMAlert.Content>
                </PMAlert.Root>
              )}
              <PMButton
                variant="secondary"
                size="sm"
                onClick={handleRegisterClick}
                loading={manifestMutation.isPending}
                disabled={manifestMutation.isPending}
              >
                <PMIcon fontSize="sm">
                  <LuGithub />
                </PMIcon>
                Register the Packmind GitHub App
              </PMButton>
              <PMText fontSize="xs" color="faded">
                Opens GitHub to register a new app for your organization. You'll
                be returned here automatically.
              </PMText>
            </PMVStack>
          ) : (
            <PMVStack gap={2} align="stretch">
              {installError && (
                <PMAlert.Root status="error">
                  <PMAlert.Indicator />
                  <PMAlert.Content>
                    <PMAlert.Description>{installError}</PMAlert.Description>
                  </PMAlert.Content>
                </PMAlert.Root>
              )}
              <PMButton
                variant="secondary"
                size="sm"
                onClick={handleInstallClick}
                loading={installUrlMutation.isPending}
                disabled={installUrlMutation.isPending}
              >
                <PMIcon fontSize="sm">
                  <LuGithub />
                </PMIcon>
                Install Packmind on GitHub
              </PMButton>
              <PMText fontSize="xs" color="faded">
                {installUrlMutation.isPending
                  ? 'Waiting for confirmation from GitHub.'
                  : 'Opens a GitHub popup. Pick the orgs and repos to grant access.'}
              </PMText>
            </PMVStack>
          )}
        </>
      )}
    </PMVStack>
  );
};

const EditionStepIndicator: React.FC<{
  registered: boolean;
  installing: boolean;
}> = ({ registered, installing }) => {
  const step1Active = !registered;
  const step2Active = registered && !installing;
  return (
    <PMHStack gap={2} align="center">
      <StepDot
        index={1}
        active={step1Active}
        done={registered}
        label="Register app"
      />
      <PMBox
        flex={1}
        height="1px"
        bg={registered ? 'branding.primary' : 'border.tertiary'}
      />
      <StepDot
        index={2}
        active={step2Active}
        done={false}
        label="Install on repos"
      />
    </PMHStack>
  );
};

const StepDot: React.FC<{
  index: number;
  active: boolean;
  done: boolean;
  label: string;
}> = ({ index, active, done, label }) => {
  return (
    <PMHStack gap={1.5} align="center">
      <PMBox
        width="18px"
        height="18px"
        borderRadius="full"
        bg={
          done
            ? 'branding.primary'
            : active
              ? 'background.tertiary'
              : 'transparent'
        }
        borderWidth="1px"
        borderColor={done ? 'branding.primary' : 'border.tertiary'}
        color={done ? 'beige.1000' : active ? 'text.primary' : 'text.faded'}
        display="flex"
        alignItems="center"
        justifyContent="center"
        fontSize="10px"
        fontWeight="bold"
      >
        {done ? <LuCheck /> : index}
      </PMBox>
      <PMText
        fontSize="xs"
        color={active || done ? 'secondary' : 'faded'}
        fontWeight={active ? 'medium' : 'normal'}
      >
        {label}
      </PMText>
    </PMHStack>
  );
};
