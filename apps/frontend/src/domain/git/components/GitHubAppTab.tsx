import React, { useState } from 'react';
import {
  PMVStack,
  PMHStack,
  PMText,
  PMButton,
  PMSpinner,
  PMAlert,
  PMAlertDialog,
  PMTooltip,
  PMLink,
  PMPageSection,
  PMBadge,
  PMDataList,
} from '@packmind/ui';
import { GitProviderWithoutToken } from '@packmind/types';
import { useGetGitProvidersQuery } from '../api/queries/GitProviderQueries';
import {
  useGetGitHubAppStatusQuery,
  useGetGitHubAppInstallationRepositoriesQuery,
  useUnlinkGitHubAppInstallationMutation,
} from '../api/queries/GitHubAppQueries';
import { gitHubAppGateway } from '../api/gateways';

interface GitHubAppTabProps {
  isAdmin: boolean;
}

type StatusTone = 'gray' | 'yellow' | 'green' | 'red';

const StatusChip: React.FC<{ tone: StatusTone; label: string }> = ({
  tone,
  label,
}) => (
  <PMBadge variant="subtle" colorPalette={tone}>
    {label}
  </PMBadge>
);

const Shell: React.FC<{
  chip?: React.ReactNode;
  children: React.ReactNode;
}> = ({ chip, children }) => (
  <PMPageSection
    variant="outline"
    backgroundColor="primary"
    title="GitHub App"
    cta={chip}
  >
    <PMVStack gap={4} align="start" width="full">
      {children}
    </PMVStack>
  </PMPageSection>
);

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
    <Shell chip={<StatusChip tone="gray" label="Not configured" />}>
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
    </Shell>
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
    <Shell chip={<StatusChip tone="yellow" label="Awaiting installation" />}>
      <PMDataList
        items={[
          {
            label: 'App',
            value: (
              <PMLink href={htmlUrl} target="_blank" rel="noopener noreferrer">
                {slug}
              </PMLink>
            ),
          },
        ]}
      />
      <PMText color="secondary">
        The app is registered but not yet installed on any GitHub organization.
        Install it to grant Packmind access to your repositories.
      </PMText>
      <PMButton onClick={handleInstall}>
        Install on a GitHub organization
      </PMButton>
    </Shell>
  );
};

const InstallationRepositoryCount: React.FC<{
  provider: GitProviderWithoutToken;
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
          Unable to load
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
    <PMText>
      {count} {count === 1 ? 'repository' : 'repositories'} accessible
    </PMText>
  );
};

const InstallationLinked: React.FC<{
  provider: GitProviderWithoutToken;
  slug: string;
  htmlUrl: string;
  isAdmin: boolean;
}> = ({ provider, slug, htmlUrl, isAdmin }) => {
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

  const items = [
    {
      label: 'App',
      value: (
        <PMLink href={htmlUrl} target="_blank" rel="noopener noreferrer">
          {slug}
        </PMLink>
      ),
    },
    ...(provider.githubAppInstallationId
      ? [
          {
            label: 'Installation',
            value: `#${provider.githubAppInstallationId}`,
          },
        ]
      : []),
    {
      label: 'Repositories',
      value: (
        <InstallationRepositoryCount
          provider={provider}
          onRetry={() => setRetryKey((k) => k + 1)}
          key={retryKey}
        />
      ),
    },
  ];

  return (
    <Shell chip={<StatusChip tone="green" label="Connected" />}>
      <PMDataList items={items} />

      <PMLink href={manageUrl} target="_blank" rel="noopener noreferrer">
        Manage on GitHub
      </PMLink>

      {unlinkMutation.isError && (
        <PMAlert.Root status="error" width="full">
          <PMAlert.Indicator />
          <PMAlert.Description>
            Failed to disconnect the installation. Please try again.
          </PMAlert.Description>
        </PMAlert.Root>
      )}

      {isAdmin && (
        <PMHStack width="full" justify="flex-end">
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
        </PMHStack>
      )}
    </Shell>
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
      <Shell>
        <PMHStack gap={2}>
          <PMSpinner size="sm" />
          <PMText color="secondary">Loading GitHub App status...</PMText>
        </PMHStack>
      </Shell>
    );
  }

  if (statusError || providersError) {
    return (
      <Shell chip={<StatusChip tone="red" label="Error" />}>
        <PMAlert.Root status="error" width="full">
          <PMAlert.Indicator />
          <PMAlert.Title>Error loading GitHub App status</PMAlert.Title>
          <PMAlert.Description>
            Unable to retrieve the GitHub App configuration. Please refresh the
            page.
          </PMAlert.Description>
        </PMAlert.Root>
      </Shell>
    );
  }

  if (!status) {
    return null;
  }

  if (!status.registered) {
    return <AppNotRegistered isAdmin={isAdmin} />;
  }

  const linkedProvider = providersResponse?.providers.find(
    (p: GitProviderWithoutToken) =>
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
      slug={status.slug}
      htmlUrl={status.htmlUrl}
      isAdmin={isAdmin}
    />
  );
};
