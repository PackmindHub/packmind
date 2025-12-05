import { useParams } from 'react-router';
import {
  PMPage,
  PMVStack,
  PMText,
  PMBox,
  PMEmptyState,
  PMButton,
  PMIcon,
} from '@packmind/ui';
import { useAuthContext } from '../../src/domain/accounts/hooks';
import { useGetTargetsByOrganizationQuery } from '../../src/domain/deployments/api/queries/DeploymentsQueries';
import { useGetGitReposQuery } from '../../src/domain/git/api/queries/GitRepoQueries';
import { useGetGitProvidersQuery } from '../../src/domain/git/api/queries/GitProviderQueries';
import { RepositoryTargetCard } from '../../src/domain/deployments/components/RepositoryTargetCard/RepositoryTargetCard';
import { GitRepoId } from '@packmind/types';
import { LuSettings, LuPlus } from 'react-icons/lu';

export default function TargetsRouteModule() {
  const { orgSlug } = useParams();
  const { organization } = useAuthContext();

  const {
    data: targetsWithRepository,
    isError,
    error,
  } = useGetTargetsByOrganizationQuery();

  const { data: gitRepos = [] } = useGetGitReposQuery();
  const { data: providersResponse } = useGetGitProvidersQuery();
  const providers = providersResponse?.providers ?? [];

  // Helper function to check if a gitRepoId's provider has a token
  const getProviderHasToken = (gitRepoIdToCheck: GitRepoId): boolean => {
    const gitRepo = gitRepos.find((r) => r.id === gitRepoIdToCheck);
    if (!gitRepo) return true; // Default to true if repo not found
    const provider = providers.find((p) => p.id === gitRepo.providerId);
    if (!provider) return true; // Default to true if provider not found
    return provider.hasToken;
  };

  if (!organization) {
    return null;
  }

  if (isError) {
    return (
      <PMPage title="Targets">
        <PMBox py={8}>
          <PMText color="error">
            Error loading targets:{' '}
            {error instanceof Error ? error.message : 'Unknown error'}
          </PMText>
        </PMBox>
      </PMPage>
    );
  }

  // Group targets by repository
  const repositoryGroups = new Map<
    string,
    {
      repositoryName: string;
      providerUrl: string;
      gitRepoId: string;
      targets: typeof targetsWithRepository;
    }
  >();

  targetsWithRepository?.forEach((targetWithRepo) => {
    const repoKey = `${targetWithRepo.repository.owner}/${targetWithRepo.repository.repo}`;

    if (!repositoryGroups.has(repoKey)) {
      repositoryGroups.set(repoKey, {
        repositoryName: repoKey,
        providerUrl: 'https://github.com', // TODO: Get actual provider URL
        gitRepoId: targetWithRepo.gitRepoId,
        targets: [],
      });
    }

    const repoGroup = repositoryGroups.get(repoKey);
    if (repoGroup && repoGroup.targets) {
      repoGroup.targets.push(targetWithRepo);
    }
  });

  const repositories = Array.from(repositoryGroups.values());

  return (
    <PMPage title="Targets" subtitle="Manage your deployment targets">
      <PMVStack gap={6} align="stretch">
        {repositories.length === 0 ? (
          <PMEmptyState
            title="No targets configured yet"
            description="Targets define where your recipes and standards will be distributed. To get started, you'll need to configure your Git settings first."
            icon={<PMIcon as={LuSettings} boxSize="12" color="gray.400" />}
          >
            <PMVStack gap={3} mt={6}>
              <PMButton
                size="lg"
                colorScheme="brand"
                onClick={() =>
                  (window.location.href = `/org/${orgSlug}/settings/git`)
                }
              >
                <PMIcon as={LuPlus} />
                Configure Git Settings
              </PMButton>
              <PMText fontSize="sm" color="faded">
                Once you have Git providers configured, you can create targets
                for deployment
              </PMText>
            </PMVStack>
          </PMEmptyState>
        ) : (
          repositories.map((repo) => (
            <RepositoryTargetCard
              key={repo.repositoryName}
              repositoryName={repo.repositoryName}
              providerUrl={repo.providerUrl}
              targets={repo.targets || []}
              gitRepoId={repo.gitRepoId as GitRepoId}
              hasToken={getProviderHasToken(repo.gitRepoId as GitRepoId)}
            />
          ))
        )}
      </PMVStack>
    </PMPage>
  );
}
