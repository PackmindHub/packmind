import {
  ChangeEvent,
  FormEvent,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  PMBox,
  PMButton,
  PMEmptyState,
  PMHStack,
  PMInput,
  PMNativeSelect,
  PMSpinner,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { GitProviderId, OrganizationId } from '@packmind/types';
import {
  useGetGitProvidersQuery,
  useGetAvailableRepositoriesQuery,
} from '../../git/api/queries';
import type { AvailableRepository } from '../../git/types/GitProviderTypes';
import { useLinkMarketplace } from '../api/queries';
import { LinkMarketplaceRequestBody } from '../api/gateways';
import { AgentsFieldset } from './AgentsFieldset';
import { GitNotConnectedNotice } from './GitNotConnectedNotice';
import { SubmitErrorBanner } from './SubmitErrorBanner';
import { getSubmitErrorMessage } from './errorMapping';

export interface PrivateLinkFormProps {
  organizationId: OrganizationId | string;
  orgSlug: string;
  onLinked: () => void;
  onCancel: () => void;
}

/**
 * Private path: pick a connected `GitProvider`, then pick one of its
 * repositories from the list the provider exposes. Empty providers branch
 * deep-links to settings via `<GitNotConnectedNotice/>`.
 *
 * The admin no longer types owner/repo/branch by hand — the provider resolves
 * those coordinates for us, which is what makes the flow correct for GitLab
 * subgroups (`group/subgroup` owners) and removes a class of typo errors. The
 * marketplace display name is the repository name. Deeper validation (the repo
 * exposes a `marketplace.json`) is the backend's responsibility and surfaces
 * through `SubmitErrorBanner`.
 */
export const PrivateLinkForm = ({
  organizationId,
  orgSlug,
  onLinked,
  onCancel,
}: Readonly<PrivateLinkFormProps>) => {
  const providersQuery = useGetGitProvidersQuery();
  const linkMutation = useLinkMarketplace(organizationId);

  const [gitProviderId, setGitProviderId] = useState('');
  const [selectedRepo, setSelectedRepo] = useState<AvailableRepository | null>(
    null,
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const reposQuery = useGetAvailableRepositoriesQuery(
    gitProviderId as GitProviderId,
  );

  // Only user-configured providers (PAT token or active GitHub App
  // installation) can list repositories. CLI-created providers are
  // URL-tracking-only and hold no credentials, so they are filtered out.
  const providers = (providersQuery.data?.providers ?? []).filter(
    (provider) => provider.hasAuth,
  );

  const filteredRepos = useMemo(() => {
    const repos = reposQuery.data ?? [];
    const term = searchTerm.trim().toLowerCase();
    if (!term) return repos;
    return repos.filter(
      (repo) =>
        repo.name.toLowerCase().includes(term) ||
        repo.owner.toLowerCase().includes(term) ||
        repo.fullName.toLowerCase().includes(term),
    );
  }, [reposQuery.data, searchTerm]);

  const fieldsValid = Boolean(gitProviderId.trim() && selectedRepo);

  if (providersQuery.isLoading) {
    return <PMText color="secondary">Loading your Git connections…</PMText>;
  }

  if (providers.length === 0) {
    return <GitNotConnectedNotice orgSlug={orgSlug} />;
  }

  const handleProviderChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setGitProviderId(event.target.value);
    setSelectedRepo(null);
    setSearchTerm('');
    setErrorMessage(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!fieldsValid || !selectedRepo) return;

    const body: LinkMarketplaceRequestBody = {
      gitProviderId: gitProviderId as GitProviderId,
      owner: selectedRepo.owner,
      repo: selectedRepo.name,
      branch: selectedRepo.defaultBranch,
      // The marketplace display name is the repository name — there is no
      // separate name field.
      name: selectedRepo.name,
    };

    try {
      await linkMutation.mutateAsync(body);
      setGitProviderId('');
      setSelectedRepo(null);
      setSearchTerm('');
      onLinked();
    } catch (error) {
      setErrorMessage(getSubmitErrorMessage(error));
    }
  };

  return (
    <form onSubmit={handleSubmit} aria-label="Link a private marketplace">
      <PMVStack align="stretch" gap={4}>
        {errorMessage && <SubmitErrorBanner message={errorMessage} />}

        <Field label="Git connection">
          <PMNativeSelect
            name="gitProviderId"
            value={gitProviderId}
            onChange={handleProviderChange}
            items={[
              { value: '', label: 'Select a connection' },
              ...providers.map((provider) => ({
                value: provider.id,
                label: providerLabel(provider),
              })),
            ]}
            data-testid="private-link-form-provider"
          />
        </Field>

        {gitProviderId && (
          <Field label="Repository">
            <RepositoryPicker
              isLoading={reposQuery.isLoading}
              isError={reposQuery.isError}
              repos={filteredRepos}
              searchTerm={searchTerm}
              onSearch={(value) => {
                setSearchTerm(value);
                setErrorMessage(null);
              }}
              selectedRepo={selectedRepo}
              onSelect={(repo) => {
                setSelectedRepo(repo);
                setErrorMessage(null);
              }}
            />
          </Field>
        )}

        <AgentsFieldset vendor="anthropic" />

        <PMHStack gap={2} justify="end">
          <PMButton variant="tertiary" size="sm" onClick={onCancel}>
            Cancel
          </PMButton>
          <PMButton
            variant="primary"
            size="sm"
            type="submit"
            loading={linkMutation.isPending}
            disabled={!fieldsValid || linkMutation.isPending}
          >
            Link marketplace
          </PMButton>
        </PMHStack>
      </PMVStack>
    </form>
  );
};

interface RepositoryPickerProps {
  isLoading: boolean;
  isError: boolean;
  repos: AvailableRepository[];
  searchTerm: string;
  onSearch: (value: string) => void;
  selectedRepo: AvailableRepository | null;
  onSelect: (repo: AvailableRepository) => void;
}

const RepositoryPicker = ({
  isLoading,
  isError,
  repos,
  searchTerm,
  onSearch,
  selectedRepo,
  onSelect,
}: Readonly<RepositoryPickerProps>) => {
  if (isLoading) {
    return (
      <PMHStack gap={2} color="secondary">
        <PMSpinner size="sm" />
        <PMText color="secondary">Loading repositories…</PMText>
      </PMHStack>
    );
  }

  if (isError) {
    return (
      <PMText color="error">
        Failed to load repositories. Check the provider connection and try
        again.
      </PMText>
    );
  }

  return (
    <PMVStack align="stretch" gap={2}>
      <PMInput
        placeholder="Search repositories…"
        value={searchTerm}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onSearch(event.target.value)
        }
        aria-label="Search repositories"
        size="sm"
      />
      <PMBox maxHeight="240px" overflowY="auto">
        {repos.length === 0 ? (
          <PMEmptyState
            title={
              searchTerm
                ? 'No repositories match your search.'
                : 'No repositories available from this provider.'
            }
          />
        ) : (
          <PMVStack align="stretch" gap={2}>
            {repos.map((repo) => {
              const isSelected = selectedRepo?.fullName === repo.fullName;
              return (
                <PMBox
                  key={repo.fullName}
                  p={2}
                  borderWidth="1px"
                  borderColor={isSelected ? 'blue.500' : 'border.primary'}
                  borderRadius="md"
                  cursor="pointer"
                  _hover={{ borderColor: 'blue.300' }}
                  onClick={() => onSelect(repo)}
                  data-testid={`marketplace-repo-option-${repo.fullName}`}
                >
                  <PMVStack align="start" gap={0}>
                    <PMText variant="small-important">{repo.name}</PMText>
                    <PMText variant="small" color="secondary">
                      {repo.fullName}
                    </PMText>
                  </PMVStack>
                </PMBox>
              );
            })}
          </PMVStack>
        )}
      </PMBox>
    </PMVStack>
  );
};

const Field = ({
  label,
  children,
}: Readonly<{ label: string; children: ReactNode }>) => (
  <PMVStack align="stretch" gap={1}>
    <PMText variant="small-important" color="secondary">
      {label}
    </PMText>
    {children}
  </PMVStack>
);

function providerLabel(provider: {
  source: string;
  url: string | null;
  displayName: string;
}): string {
  const displayName = provider.displayName.trim();
  if (displayName) return displayName;
  // Unnamed connections fall back to the vendor + URL coordinates.
  const vendor = provider.source.toUpperCase();
  return provider.url ? `${vendor} — ${provider.url}` : vendor;
}
