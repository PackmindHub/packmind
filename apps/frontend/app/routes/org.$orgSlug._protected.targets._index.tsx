import { NavLink, useParams } from 'react-router';
import {
  PMPage,
  PMVStack,
  PMText,
  PMSpinner,
  PMBox,
  PMEmptyState,
  PMButton,
  PMIcon,
} from '@packmind/ui';
import { useAuthContext } from '../../src/domain/accounts/hooks';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';
import { useGetTargetsByOrganizationQuery } from '../../src/domain/deployments/api/queries/DeploymentsQueries';
import { RepositoryTargetCard } from '../../src/domain/deployments/components/RepositoryTargetCard/RepositoryTargetCard';
import { GitRepoId } from '@packmind/git';
import { OrganizationId } from '@packmind/accounts';
import { LuSettings, LuPlus } from 'react-icons/lu';

export const handle = {
  crumb: ({ params }: { params: { orgSlug: string } }) => {
    return <NavLink to={`/org/${params.orgSlug}/targets`}>Targets</NavLink>;
  },
};

export default function TargetsRouteModule() {
  const { orgSlug } = useParams();
  const { organization } = useAuthContext();

  const {
    data: targetsWithRepository,
    isError,
    error,
  } = useGetTargetsByOrganizationQuery(
    organization?.id || ('' as OrganizationId),
  );

  if (!organization) {
    return null;
  }

  if (isError) {
    return (
      <PMPage title="Targets" breadcrumbComponent={<AutobreadCrumb />}>
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
    <PMPage title="Targets" breadcrumbComponent={<AutobreadCrumb />}>
      <PMVStack gap={6} align="stretch">
        {repositories.length === 0 ? (
          <PMEmptyState
            title="No targets configured yet"
            description="Targets define where your recipes and standards will be deployed. To get started, you'll need to configure your Git settings first."
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
            />
          ))
        )}
      </PMVStack>
    </PMPage>
  );
}
