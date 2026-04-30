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
import {
  useListActiveDistributedPackagesBySpaceQuery,
  useListPackagesBySpaceQuery,
} from '../../../deployments/api/queries/DeploymentsQueries';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import {
  TargetId,
  GitRepo,
  GitProviderId,
  DeployedRecipeTargetInfo,
  DeployedStandardTargetInfo,
  DeployedSkillTargetInfo,
  PackageId,
} from '@packmind/types';
import { LuCircleCheckBig } from 'react-icons/lu';
import { RepositoryTargetTable } from '../../../deployments/components/RepositoryTargetTable/RepositoryTargetTable';
import { groupTargetByPackage } from '../../../deployments/utils/groupTargetByPackage';
import { useGetGitProvidersQuery } from '../../../git/api/queries/GitProviderQueries';

// ---- Types & constants
type RepoResult = {
  repoKey: string;
  title: string;
  providerId: GitProviderId;
  targets: Array<{
    id: TargetId;
    title: string;
    activePackageIds: ReadonlySet<PackageId>;
    recipes: DeployedRecipeTargetInfo[];
    standards: DeployedStandardTargetInfo[];
    skills: DeployedSkillTargetInfo[];
  }>;
};

export const OutdatedTargetsSection: React.FC = () => {
  const { orgSlug } = useParams() as { orgSlug?: string };
  const { spaceId, space } = useCurrentSpace();
  const organizationId = space?.organizationId;
  const {
    data: overviewData,
    isLoading,
    isError,
    error,
  } = useListActiveDistributedPackagesBySpaceQuery(spaceId);
  const { data: packagesResponse, isLoading: isPackagesLoading } =
    useListPackagesBySpaceQuery(spaceId, organizationId);
  const packages = packagesResponse?.packages ?? [];
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
      const hasOutdated =
        t.outdatedRecipes.length > 0 ||
        t.outdatedStandards.length > 0 ||
        t.outdatedSkills.length > 0;
      if (!hasOutdated) continue;

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
        activePackageIds: new Set(t.packages.map((p) => p.packageId)),
        recipes: t.outdatedRecipes,
        standards: t.outdatedStandards,
        skills: t.outdatedSkills,
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
                  {!isPackagesLoading &&
                    repo.targets.map((t) => (
                      <RepositoryTargetTable
                        key={String(t.id)}
                        orgSlug={orgSlug}
                        target={{ id: t.id, name: t.title }}
                        packageGroups={groupTargetByPackage(
                          {
                            recipes: t.recipes,
                            standards: t.standards,
                            skills: t.skills,
                          },
                          packages,
                          undefined,
                          t.activePackageIds,
                        )}
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

// ---- Pure helpers
const getRepoIdentity = (gitRepo: GitRepo) => {
  const title = `${gitRepo.owner}/${gitRepo.repo}:${gitRepo.branch}`;
  const key = gitRepo.id || title;
  return { key, title };
};
