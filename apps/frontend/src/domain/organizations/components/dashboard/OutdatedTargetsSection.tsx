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
import { useGetDashboardOutdatedQuery } from '../../../deployments/api/queries/DeploymentsQueries';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import {
  TargetId,
  GitRepo,
  DeployedRecipeTargetInfo,
  DeployedStandardTargetInfo,
} from '@packmind/types';
import { LuCircleCheckBig } from 'react-icons/lu';
import { RepositoryTargetTable } from '../../../deployments/components/RepositoryTargetTable/RepositoryTargetTable';

// ---- Types & constants
type RepoResult = {
  repoKey: string;
  title: string;
  targets: Array<{
    id: TargetId;
    title: string;
    recipes: DeployedRecipeTargetInfo[];
    standards: DeployedStandardTargetInfo[];
  }>;
};

export const OutdatedTargetsSection: React.FC = () => {
  const { orgSlug } = useParams() as { orgSlug?: string };
  const { spaceId } = useCurrentSpace();
  const {
    data: outdatedData,
    isLoading,
    isError,
    error,
  } = useGetDashboardOutdatedQuery(spaceId ?? '');

  const reposWithTargets = useMemo(() => {
    if (!outdatedData?.targets) return [];
    type TargetValue = RepoResult['targets'][number];
    const repoMap = new Map<
      string,
      { repoKey: string; title: string; targets: Map<TargetId, TargetValue> }
    >();

    for (const t of outdatedData.targets) {
      const { key, title } = getRepoIdentity(t.gitRepo);
      let repo = repoMap.get(key);
      if (!repo) {
        repo = { repoKey: key, title, targets: new Map() };
        repoMap.set(key, repo);
      }
      repo.targets.set(t.target.id, {
        id: t.target.id,
        title: t.target.name,
        recipes: t.outdatedRecipes,
        standards: t.outdatedStandards,
      });
    }

    return Array.from(repoMap.values())
      .map((r) => ({
        repoKey: r.repoKey,
        title: r.title,
        targets: Array.from(r.targets.values()).sort((a, b) =>
          a.title.localeCompare(b.title),
        ),
      }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [outdatedData]);

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
                      recipes={t.recipes}
                      standards={t.standards}
                      skills={[]}
                      mode="outdated"
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
