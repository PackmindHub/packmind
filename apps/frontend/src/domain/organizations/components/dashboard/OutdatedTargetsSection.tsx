import React, { useMemo } from 'react';
import { useParams } from 'react-router';
import {
  PMPageSection,
  PMVStack,
  PMSpinner,
  PMAlert,
  PMEmptyState,
  PMHeading,
  PMBox,
  PMIcon,
} from '@packmind/ui';
import { useListActiveDistributedPackagesBySpaceQuery } from '../../../deployments/api/queries/DeploymentsQueries';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import {
  ActiveDistributedPackage,
  TargetId,
  GitRepo,
  GitProviderId,
} from '@packmind/types';
import { LuCircleCheckBig } from 'react-icons/lu';
import { RepositoryTargetTable } from '../../../deployments/components/RepositoryTargetTable/RepositoryTargetTable';
import { useGetGitProvidersQuery } from '../../../git/api/queries/GitProviderQueries';

type RepoResult = {
  repoKey: string;
  title: string;
  providerId: GitProviderId;
  targets: Array<{
    id: TargetId;
    title: string;
    packages: ActiveDistributedPackage[];
  }>;
};

const isOutdated = (d: { isUpToDate: boolean; isDeleted?: boolean }): boolean =>
  !d.isUpToDate || !!d.isDeleted;

const filterPackageToOutdated = (
  pkg: ActiveDistributedPackage,
): ActiveDistributedPackage | null => {
  const deployedRecipes = pkg.deployedRecipes.filter(isOutdated);
  const deployedStandards = pkg.deployedStandards.filter(isOutdated);
  const deployedSkills = pkg.deployedSkills.filter(isOutdated);
  const total =
    deployedRecipes.length +
    deployedStandards.length +
    deployedSkills.length +
    pkg.pendingRecipes.length +
    pkg.pendingStandards.length +
    pkg.pendingSkills.length;
  if (total === 0) return null;
  return {
    ...pkg,
    deployedRecipes,
    deployedStandards,
    deployedSkills,
  };
};

export const OutdatedTargetsSection: React.FC = () => {
  const { orgSlug } = useParams() as { orgSlug?: string };
  const { spaceId } = useCurrentSpace();
  const {
    data: overviewData,
    isLoading,
    isError,
    error,
  } = useListActiveDistributedPackagesBySpaceQuery(spaceId);
  const { data: gitProvidersResponse, isLoading: isProvidersLoading } =
    useGetGitProvidersQuery();
  const providersWithToken = useMemo(() => {
    const set = new Set<GitProviderId>();
    gitProvidersResponse?.providers
      .filter((provider) => provider.hasToken)
      .forEach((provider) => set.add(provider.id));
    return set;
  }, [gitProvidersResponse]);

  const reposWithTargets = useMemo<RepoResult[]>(() => {
    if (!overviewData) return [];
    type TargetValue = RepoResult['targets'][number];
    const repoMap = new Map<
      string,
      {
        repoKey: string;
        title: string;
        providerId: GitProviderId;
        targets: Map<TargetId, TargetValue>;
      }
    >();

    for (const t of overviewData) {
      if (!t.gitRepo) continue;
      const outdatedPackages = t.packages
        .map(filterPackageToOutdated)
        .filter((p): p is ActiveDistributedPackage => p !== null);
      if (outdatedPackages.length === 0) continue;

      const { key, title } = getRepoIdentity(t.gitRepo);
      let repo = repoMap.get(key);
      if (!repo) {
        repo = {
          repoKey: key,
          title,
          providerId: t.gitRepo.providerId,
          targets: new Map(),
        };
        repoMap.set(key, repo);
      }
      repo.targets.set(t.target.id, {
        id: t.target.id,
        title: t.target.name,
        packages: outdatedPackages,
      });
    }

    return Array.from(repoMap.values())
      .map((r) => ({
        repoKey: r.repoKey,
        title: r.title,
        providerId: r.providerId,
        targets: Array.from(r.targets.values()).sort((a, b) =>
          a.title.localeCompare(b.title),
        ),
      }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [overviewData]);

  return (
    <PMPageSection
      title="Outdated artifacts"
      headingLevel="h5"
      boxProps={{ padding: 0 }}
    >
      {isLoading && (
        <PMBox backgroundColor={'background.primary'} padding={4} my={4}>
          <PMEmptyState
            icon={<PMSpinner />}
            title="Loading deployment history..."
          />
        </PMBox>
      )}

      {isError && (
        <PMAlert.Root status="error">
          <PMAlert.Indicator />
          <PMAlert.Content>
            {(error as Error)?.message || 'Unable to retrieve deployment data'}
          </PMAlert.Content>
        </PMAlert.Root>
      )}

      {!isLoading && !isError && reposWithTargets.length === 0 && (
        <PMBox
          backgroundColor={'background.primary'}
          padding={4}
          my={4}
          w={'full'}
        >
          <PMEmptyState
            icon={
              <PMIcon color={'green.500'}>
                <LuCircleCheckBig />
              </PMIcon>
            }
            title="Everything is up-to-date!"
            description="All distributed artifacts are up-to-date across your targets."
          />
        </PMBox>
      )}

      {!isLoading && !isError && reposWithTargets.length > 0 && (
        <PMVStack gap={4} align="stretch" width="full">
          {reposWithTargets.map((repo) => {
            return (
              <PMVStack
                key={repo.repoKey}
                align="stretch"
                border={'solid 1px'}
                borderColor={'border.primary'}
                gap={0}
              >
                <PMBox
                  borderBottom={'solid 1px'}
                  borderColor={'border.primary'}
                  padding={4}
                  backgroundColor={'background.primary'}
                >
                  <PMHeading level="h6">{repo.title}</PMHeading>
                </PMBox>
                <PMVStack align="stretch" width="full" padding={2}>
                  {repo.targets.map((t) => (
                    <RepositoryTargetTable
                      key={String(t.id)}
                      orgSlug={orgSlug}
                      target={{ id: t.id, name: t.title }}
                      packageGroups={t.packages}
                      mode="outdated"
                      canDistributeFromApp={
                        !isProvidersLoading &&
                        providersWithToken.has(repo.providerId)
                      }
                      isDistributeReadinessLoading={isProvidersLoading}
                    />
                  ))}
                </PMVStack>
              </PMVStack>
            );
          })}
        </PMVStack>
      )}
    </PMPageSection>
  );
};

const getRepoIdentity = (gitRepo: GitRepo) => {
  const title = `${gitRepo.owner}/${gitRepo.repo}:${gitRepo.branch}`;
  const key = gitRepo.id || title;
  return { key, title };
};
