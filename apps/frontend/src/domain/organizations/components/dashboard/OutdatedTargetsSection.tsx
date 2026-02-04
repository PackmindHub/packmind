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
  useGetRecipesDeploymentOverviewQuery,
  useGetStandardsDeploymentOverviewQuery,
} from '../../../deployments/api/queries/DeploymentsQueries';
import {
  TargetId,
  DeploymentOverview,
  StandardDeploymentOverview,
  GitRepo,
  DeployedRecipeTargetInfo,
  DeployedStandardTargetInfo,
} from '@packmind/types';
import { LuCircleCheckBig } from 'react-icons/lu';
import { RepositoryTargetTable } from '../../../deployments/components/RepositoryTargetTable/RepositoryTargetTable';

// ---- Types & constants
type TargetEntry = {
  id: TargetId;
  title: string; // target name
  recipes: DeployedRecipeTargetInfo[];
  standards: DeployedStandardTargetInfo[];
};

type RepoEntry = {
  repoKey: string; // gitRepo.id or owner/repo:branch
  title: string; // owner/repo:branch
  targets: Map<TargetId, TargetEntry>;
};

type RepoResult = {
  repoKey: string;
  title: string;
  targets: Array<{
    id: TargetId;
    title: string;
    recipes: TargetEntry['recipes'];
    standards: TargetEntry['standards'];
  }>;
};

export const OutdatedTargetsSection: React.FC = () => {
  const { orgSlug } = useParams() as { orgSlug?: string };
  const {
    data: recipesOverview,
    isLoading: isRecipesLoading,
    isError: isRecipesError,
    error: recipesError,
  } = useGetRecipesDeploymentOverviewQuery();

  const {
    data: standardsOverview,
    isLoading: isStandardsLoading,
    isError: isStandardsError,
    error: standardsError,
  } = useGetStandardsDeploymentOverviewQuery();

  const isLoading = isRecipesLoading || isStandardsLoading;
  const isError = isRecipesError || isStandardsError;

  const reposWithTargets = useMemo(
    () => buildReposWithTargets(recipesOverview, standardsOverview, orgSlug),
    [recipesOverview, standardsOverview, orgSlug],
  );

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
            {(recipesError as Error)?.message ||
              (standardsError as Error)?.message ||
              'Unable to retrieve deployment data'}
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

const ensureRepo = (
  repoMap: Map<string, RepoEntry>,
  key: string,
  title: string,
) => {
  let repo = repoMap.get(key);
  if (!repo) {
    repo = { repoKey: key, title, targets: new Map() };
    repoMap.set(key, repo);
  }
  return repo;
};

const upsertRows = (
  repoMap: Map<string, RepoEntry>,
  repoKey: string,
  repoTitle: string,
  targetId: TargetId,
  targetTitle: string,
  items: {
    recipes?: TargetEntry['recipes'];
    standards?: TargetEntry['standards'];
  },
) => {
  const repo = ensureRepo(repoMap, repoKey, repoTitle);
  let target = repo.targets.get(targetId);
  if (!target) {
    target = { id: targetId, title: targetTitle, recipes: [], standards: [] };
    repo.targets.set(targetId, target);
  }
  items.recipes?.length && target.recipes.push(...items.recipes);
  items.standards?.length && target.standards.push(...items.standards);
};
const buildReposWithTargets = (
  recipesOverview: DeploymentOverview | undefined,
  standardsOverview: StandardDeploymentOverview | undefined,
  orgSlug: string | undefined,
): RepoResult[] => {
  const repoMap = new Map<string, RepoEntry>();

  // Standards by repo/target
  if (standardsOverview?.targets) {
    for (const t of standardsOverview.targets) {
      const { key: repoKey, title: repoTitle } = getRepoIdentity(t.gitRepo);
      const targetId = t.target.id;
      const targetTitle = t.target.name;
      upsertRows(repoMap, repoKey, repoTitle, targetId, targetTitle, {
        standards: (t.deployedStandards || []).filter((s) => !s.isUpToDate),
      });
    }
  }

  // Recipes by repo/target (processed after standards to keep standards first)
  if (recipesOverview?.targets) {
    for (const t of recipesOverview.targets) {
      const { key: repoKey, title: repoTitle } = getRepoIdentity(t.gitRepo);
      const targetId = t.target.id;
      const targetTitle = t.target.name;
      upsertRows(repoMap, repoKey, repoTitle, targetId, targetTitle, {
        recipes: (t.deployedRecipes || []).filter((r) => !r.isUpToDate),
      });
    }
  }

  // Convert to sorted arrays and exclude empty targets/repos
  const repos = Array.from(repoMap.values())
    .map((r) => ({
      repoKey: r.repoKey,
      title: r.title,
      targets: Array.from(r.targets.values())
        .map((t) => ({
          id: t.id,
          title: t.title,
          recipes: t.recipes,
          standards: t.standards,
        }))
        .filter((t) => t.recipes.length > 0 || t.standards.length > 0)
        .sort((a, b) => a.title.localeCompare(b.title)),
    }))
    .filter((r) => r.targets.length > 0)
    .sort((a, b) => a.title.localeCompare(b.title));

  return repos;
};
