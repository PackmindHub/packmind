import React, { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router';
import {
  PMPageSection,
  PMVStack,
  PMHStack,
  PMSpinner,
  PMText,
  PMAlert,
  PMEmptyState,
  PMBadge,
  PMLink,
  PMTable,
  PMTableColumn,
  PMTableRow,
  PMHeading,
  PMBox,
  PMButton,
  PMDialog,
  PMPortal,
  PMCloseButton,
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
  DeployedRecipeTargetInfo,
  DeployedStandardTargetInfo,
  GitRepo,
} from '@packmind/shared';
import {
  RunDistribution,
  useRunDistribution,
} from '../../../deployments/components/RunDistribution/RunDistribution';
import { LuCircleCheckBig } from 'react-icons/lu';

// ---- Types & constants
type TargetEntry = {
  id: TargetId;
  title: string; // target name
  rows: PMTableRow[];
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
    rows: PMTableRow[];
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
      title="Outdated deployments"
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
        <PMBox backgroundColor={'background.primary'} padding={4} my={4}>
          <PMEmptyState
            icon={
              <PMIcon color={'green.500'}>
                <LuCircleCheckBig />
              </PMIcon>
            }
            title="No outdated deployments"
            description="All deployed recipes and standards are up-to-date across your targets."
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
                    <PMVStack
                      align="flex-start"
                      width="full"
                      key={String(t.id)}
                      gap={0}
                      border={'solid 1px'}
                      borderColor={'border.primary'}
                      padding={2}
                    >
                      <PMBox>
                        <PMBadge colorPalette="gray" size="xs" marginRight={2}>
                          Target
                        </PMBadge>
                        <PMText variant="body-important">{t.title} </PMText>
                      </PMBox>
                      <PMTable
                        columns={TABLE_COLUMNS}
                        data={t.rows}
                        size="sm"
                      />
                    </PMVStack>
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

const TABLE_COLUMNS: PMTableColumn[] = [
  { key: 'name', header: 'Name', width: '42%', grow: true },
  {
    key: 'version',
    header: 'Version (deployed → latest)',
    width: '28%',
    align: 'center',
  },
  { key: 'status', header: 'Status', width: '15%', align: 'center' },
  { key: 'action', header: 'Action', width: '15%', align: 'center' },
];

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
  rows: PMTableRow[],
) => {
  if (rows.length === 0) return;
  const repo = ensureRepo(repoMap, repoKey, repoTitle);
  let target = repo.targets.get(targetId);
  if (!target) {
    target = { id: targetId, title: targetTitle, rows: [] };
    repo.targets.set(targetId, target);
  }
  target.rows.push(...rows);
};

const getGapPalette = (gap: number): 'blue' | 'orange' | 'red' => {
  if (gap >= 10) return 'red';
  if (gap >= 5) return 'orange';
  return 'blue';
};

const PreselectTarget: React.FC<{ targetId: TargetId }> = ({ targetId }) => {
  const { setSelectedTargetIds } = useRunDistribution();
  useEffect(() => {
    setSelectedTargetIds([targetId]);
  }, [setSelectedTargetIds, targetId]);
  return null;
};

const UpdateDialogAction: React.FC<{
  targetId: TargetId;
  recipe?: DeployedRecipeTargetInfo['recipe'];
  standard?: DeployedStandardTargetInfo['standard'];
}> = ({ targetId, recipe, standard }) => {
  return (
    <PMDialog.Root
      size="md"
      placement="center"
      motionPreset="slide-in-bottom"
      scrollBehavior={'outside'}
    >
      <PMDialog.Trigger asChild>
        <PMButton size="xs" variant="secondary">
          Update
        </PMButton>
      </PMDialog.Trigger>
      <PMPortal>
        <PMDialog.Backdrop />
        <PMDialog.Positioner>
          <PMDialog.Content>
            <PMDialog.Context>
              {(store) => (
                <RunDistribution
                  selectedRecipes={recipe ? [recipe] : []}
                  selectedStandards={standard ? [standard] : []}
                  onDistributionComplete={() => store.setOpen(false)}
                >
                  <PMDialog.Header>
                    <PMDialog.Title asChild>
                      <PMHeading level="h6">Deploy to targets</PMHeading>
                    </PMDialog.Title>
                    <PMDialog.CloseTrigger asChild>
                      <PMCloseButton size="sm" />
                    </PMDialog.CloseTrigger>
                  </PMDialog.Header>

                  <PMDialog.Body>
                    <PreselectTarget targetId={targetId} />
                    <RunDistribution.Body />
                  </PMDialog.Body>

                  <PMDialog.Footer>
                    <PMDialog.Trigger asChild>
                      <PMButton variant="tertiary" size="sm">
                        Cancel
                      </PMButton>
                    </PMDialog.Trigger>
                    <RunDistribution.Cta />
                  </PMDialog.Footer>
                </RunDistribution>
              )}
            </PMDialog.Context>
          </PMDialog.Content>
        </PMDialog.Positioner>
      </PMPortal>
    </PMDialog.Root>
  );
};

const buildRecipeRows = (
  items: DeployedRecipeTargetInfo[],
  orgSlug: string | undefined,
  targetId: TargetId,
): PMTableRow[] =>
  items
    .slice()
    .filter((d) => !d.isUpToDate)
    .sort((a, b) => a.recipe.name.localeCompare(b.recipe.name))
    .map((d) => ({
      name: (
        <PMVStack align="start" gap={0}>
          <PMText variant="small" color="tertiary">
            Recipe
          </PMText>
          <PMLink asChild>
            <Link to={`/org/${orgSlug}/recipes/${d.recipe.id}`}>
              {d.recipe.name}
            </Link>
          </PMLink>
        </PMVStack>
      ),
      version: (
        <PMHStack gap={2} justify="center" align="center">
          <PMBadge colorPalette="gray" size="sm">
            {d.deployedVersion.version}
          </PMBadge>
          <PMText variant="small" color="faded">
            →
          </PMText>
          {(() => {
            const gap = d.latestVersion.version - d.deployedVersion.version;
            const palette = getGapPalette(gap);
            return (
              <PMBadge colorPalette={palette} size="sm">
                {d.latestVersion.version}
              </PMBadge>
            );
          })()}
        </PMHStack>
      ),
      status: (
        <PMBadge colorPalette="red" size="sm">
          Outdated
        </PMBadge>
      ),
      action: <UpdateDialogAction targetId={targetId} recipe={d.recipe} />,
    }));

const buildStandardRows = (
  items: DeployedStandardTargetInfo[],
  orgSlug: string | undefined,
  targetId: TargetId,
): PMTableRow[] =>
  items
    .slice()
    .filter((d) => !d.isUpToDate)
    .sort((a, b) => a.standard.name.localeCompare(b.standard.name))
    .map((d) => ({
      name: (
        <PMVStack align="start" gap={0}>
          <PMText variant="small" color="tertiary">
            Standard
          </PMText>
          <PMLink asChild>
            <Link to={`/org/${orgSlug}/standards/${d.standard.id}`}>
              {d.standard.name}
            </Link>
          </PMLink>
        </PMVStack>
      ),
      version: (
        <PMHStack gap={2} justify="center" align="center">
          <PMBadge colorPalette="gray" size="sm">
            {d.deployedVersion.version}
          </PMBadge>
          <PMText variant="small" color="faded">
            →
          </PMText>
          {(() => {
            const gap = d.latestVersion.version - d.deployedVersion.version;
            const palette = getGapPalette(gap);
            return (
              <PMBadge colorPalette={palette} size="sm">
                {d.latestVersion.version}
              </PMBadge>
            );
          })()}
        </PMHStack>
      ),
      status: (
        <PMBadge colorPalette="red" size="sm">
          Outdated
        </PMBadge>
      ),
      action: <UpdateDialogAction targetId={targetId} standard={d.standard} />,
    }));

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
      const rows = buildStandardRows(t.deployedStandards, orgSlug, targetId);
      upsertRows(repoMap, repoKey, repoTitle, targetId, targetTitle, rows);
    }
  }

  // Recipes by repo/target (processed after standards to keep standards first)
  if (recipesOverview?.targets) {
    for (const t of recipesOverview.targets) {
      const { key: repoKey, title: repoTitle } = getRepoIdentity(t.gitRepo);
      const targetId = t.target.id;
      const targetTitle = t.target.name;
      const rows = buildRecipeRows(t.deployedRecipes, orgSlug, targetId);
      upsertRows(repoMap, repoKey, repoTitle, targetId, targetTitle, rows);
    }
  }

  // Convert to sorted arrays and exclude empty targets/repos
  const repos = Array.from(repoMap.values())
    .map((r) => ({
      repoKey: r.repoKey,
      title: r.title,
      targets: Array.from(r.targets.values())
        .map((t) => ({ id: t.id, title: t.title, rows: t.rows }))
        .filter((t) => t.rows.length > 0)
        .sort((a, b) => a.title.localeCompare(b.title)),
    }))
    .filter((r) => r.targets.length > 0)
    .sort((a, b) => a.title.localeCompare(b.title));

  return repos;
};
