import React, { useState } from 'react';
import {
  PMBox,
  PMVStack,
  PMHStack,
  PMHeading,
  PMText,
  PMButton,
  PMSpinner,
  PMAlert,
  PMEmptyState,
  PMAlertDialog,
  PMTooltip,
  PMLink,
} from '@packmind/ui';
import { GitProvider } from '@packmind/types';
import { useGetGitHubAppStatusQuery } from '../api/queries/GitHubAppQueries';
import { useGetGitProvidersQuery } from '../api/queries/GitProviderQueries';
import {
  useUnlinkGitHubAppInstallationMutation,
  useGetGitHubAppInstallationRepositoriesQuery,
} from '../api/queries/GitHubAppQueries';
import { gitHubAppGateway } from '../api/gateways';

interface GitHubAppTabProps {
  isAdmin: boolean;
}

const AppNotRegistered: React.FC<{ isAdmin: boolean }> = ({ isAdmin }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { manifest, state, manifestPostUrl } =
        await gitHubAppGateway.getManifest();
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
      setError('Failed to fetch the GitHub App manifest. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <PMVStack gap={4} align="start">
      <PMHeading level="h3">Register a GitHub App</PMHeading>
      <PMText color="secondary">
        Connect Packmind to GitHub by registering a dedicated GitHub App for
        your instance. This enables secure, installation-scoped repository
        access without requiring personal access tokens.
      </PMText>

      {error && (
        <PMAlert.Root status="error" width="full">
          <PMAlert.Indicator />
          <PMAlert.Description>{error}</PMAlert.Description>
        </PMAlert.Root>
      )}

      <PMTooltip
        label={
          isAdmin ? undefined : 'Only org admins can register a GitHub App.'
        }
        disabled={isAdmin}
      >
        <PMButton
          onClick={handleRegister}
          disabled={!isAdmin || isLoading}
          loading={isLoading}
        >
          Register on GitHub
        </PMButton>
      </PMTooltip>
    </PMVStack>
  );
};

const AppRegisteredNoInstallation: React.FC<{
  slug: string;
  htmlUrl: string;
  installUrl: string;
}> = ({ slug, htmlUrl, installUrl }) => {
  const handleInstall = () => {
    window.open(installUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <PMVStack gap={4} align="start">
      <PMHStack gap={2}>
        <PMText variant="body-important">GitHub App registered:</PMText>
        <PMLink href={htmlUrl} target="_blank" rel="noopener noreferrer">
          {slug}
        </PMLink>
      </PMHStack>
      <PMText color="secondary">
        The app is registered but not yet installed on any GitHub organization.
        Install it to grant Packmind access to your repositories.
      </PMText>
      <PMButton onClick={handleInstall}>
        Install on a GitHub organization
      </PMButton>
    </PMVStack>
  );
};

const InstallationRepositoryCount: React.FC<{
  provider: GitProvider;
  onRetry: () => void;
}> = ({ provider, onRetry }) => {
  const { data, isLoading, isError, refetch } =
    useGetGitHubAppInstallationRepositoriesQuery(provider.id);

  if (isLoading) {
    return <PMSpinner size="sm" />;
  }

  if (isError) {
    return (
      <PMHStack gap={2}>
        <PMText color="error" variant="small">
          Unable to load repositories
        </PMText>
        <PMButton
          size="xs"
          variant="secondary"
          onClick={() => {
            onRetry();
            refetch();
          }}
        >
          Retry
        </PMButton>
      </PMHStack>
    );
  }

  const count = data?.repositories.length ?? 0;
  return (
    <PMText color="secondary" variant="small">
      {provider.githubAppInstallationId
        ? `Installation · ${count} ${count === 1 ? 'repository' : 'repositories'} accessible`
        : `${count} ${count === 1 ? 'repository' : 'repositories'} accessible`}
    </PMText>
  );
};

const InstallationLinked: React.FC<{
  provider: GitProvider;
  htmlUrl: string;
  isAdmin: boolean;
}> = ({ provider, htmlUrl, isAdmin }) => {
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const unlinkMutation = useUnlinkGitHubAppInstallationMutation();

  const manageUrl = `${htmlUrl}/installations/new`;

  const handleDisconnect = () => {
    unlinkMutation.mutate(undefined, {
      onSuccess: () => {
        setDisconnectOpen(false);
      },
      onError: () => {
        setDisconnectOpen(false);
      },
    });
  };

  return (
    <PMVStack gap={4} align="start">
      <PMBox
        p={4}
        borderWidth="1px"
        borderRadius="md"
        borderColor="border.default"
        width="full"
      >
        <PMVStack gap={2} align="start">
          <PMText variant="body-important">
            {provider.githubAppInstallationId
              ? `Installation #${provider.githubAppInstallationId}`
              : 'GitHub App installation'}
          </PMText>
          <InstallationRepositoryCount
            provider={provider}
            onRetry={() => setRetryKey((k) => k + 1)}
            key={retryKey}
          />
          <PMLink href={manageUrl} target="_blank" rel="noopener noreferrer">
            Manage on GitHub
          </PMLink>
        </PMVStack>
      </PMBox>

      {unlinkMutation.isError && (
        <PMAlert.Root status="error" width="full">
          <PMAlert.Indicator />
          <PMAlert.Description>
            Failed to disconnect the installation. Please try again.
          </PMAlert.Description>
        </PMAlert.Root>
      )}

      {isAdmin && (
        <PMAlertDialog
          trigger={
            <PMButton variant="secondary" colorScheme="red">
              Disconnect
            </PMButton>
          }
          title="Disconnect GitHub App installation"
          message="This stops Packmind from accessing this GitHub installation. The App stays installed on GitHub; uninstall it there to fully revoke."
          confirmText="Disconnect"
          cancelText="Cancel"
          confirmColorScheme="red"
          onConfirm={handleDisconnect}
          open={disconnectOpen}
          onOpenChange={({ open }) => setDisconnectOpen(open)}
          isLoading={unlinkMutation.isPending}
        />
      )}
    </PMVStack>
  );
};

export const GitHubAppTab: React.FC<GitHubAppTabProps> = ({ isAdmin }) => {
  const {
    data: status,
    isLoading: statusLoading,
    isError: statusError,
  } = useGetGitHubAppStatusQuery();

  const {
    data: providersResponse,
    isLoading: providersLoading,
    isError: providersError,
  } = useGetGitProvidersQuery();

  if (statusLoading || providersLoading) {
    return (
      <PMEmptyState icon={<PMSpinner />} title="Loading GitHub App status..." />
    );
  }

  if (statusError || providersError) {
    return (
      <PMAlert.Root status="error" my={4}>
        <PMAlert.Indicator />
        <PMAlert.Title>Error loading GitHub App status</PMAlert.Title>
        <PMAlert.Description>
          Unable to retrieve the GitHub App configuration. Please refresh the
          page.
        </PMAlert.Description>
      </PMAlert.Root>
    );
  }

  if (!status) {
    return null;
  }

  if (!status.registered) {
    return <AppNotRegistered isAdmin={isAdmin} />;
  }

  const linkedProvider = providersResponse?.providers.find(
    (p: GitProvider) =>
      p.authType === 'github_app' && p.githubAppInstallationId != null,
  );

  if (!linkedProvider) {
    return (
      <AppRegisteredNoInstallation
        slug={status.slug}
        htmlUrl={status.htmlUrl}
        installUrl={status.installUrl}
      />
    );
  }

  return (
    <InstallationLinked
      provider={linkedProvider}
      htmlUrl={status.htmlUrl}
      isAdmin={isAdmin}
    />
  );
};
