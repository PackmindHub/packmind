import React from 'react';
import {
  PMBox,
  PMHeading,
  PMVStack,
  PMText,
  PMEmptyState,
  PMBadge,
  PMHStack,
  PMIcon,
} from '@packmind/ui';
import {
  RepositoryStandardDeploymentStatus,
  DeployedStandardInfo,
} from '@packmind/deployments';
import { GitRepo } from '@packmind/git/types';
import {
  DeploymentItem,
  DeploymentEntry,
} from '../DeploymentItem/DeploymentItem';
import {
  DeployedRecipeInfo,
  RepositoryDeploymentStatus,
  TargetDeploymentStatus,
  TargetStandardDeploymentStatus,
} from '@packmind/shared';
import { LuCircleCheckBig, LuClockAlert } from 'react-icons/lu';

interface CombinedRepositoryDeploymentStatus {
  gitRepo: GitRepo;
  deployedRecipes: DeployedRecipeInfo[];
  deployedStandards: DeployedStandardInfo[];
  hasOutdatedRecipes: boolean;
  hasOutdatedStandards: boolean;
  // Target-based grouping
  recipeTargets?: TargetDeploymentStatus[];
  standardTargets?: TargetStandardDeploymentStatus[];
}

interface RepositoryCentricViewProps {
  recipeRepositories: RepositoryDeploymentStatus[];
  standardRepositories?: RepositoryStandardDeploymentStatus[];
  recipeTargets?: TargetDeploymentStatus[];
  standardTargets?: TargetStandardDeploymentStatus[];
  searchTerm?: string;
  showOnlyOutdated?: boolean;
  selectedTargetNames?: string[];
}

export const RepositoryCentricView: React.FC<RepositoryCentricViewProps> = ({
  recipeRepositories,
  standardRepositories = [],
  recipeTargets = [],
  standardTargets = [],
  searchTerm = '',
  showOnlyOutdated = false,
  selectedTargetNames = [],
}) => {
  // Use target-based data if available, fallback to repository-based data
  const shouldUseTargetData =
    recipeTargets.length > 0 || standardTargets.length > 0;

  let combinedRepositories: Map<string, CombinedRepositoryDeploymentStatus>;

  if (shouldUseTargetData) {
    // Group targets by repository for target-centric display
    combinedRepositories = new Map<
      string,
      CombinedRepositoryDeploymentStatus
    >();

    // Process recipe targets - group by repository
    recipeTargets.forEach((targetDeployment) => {
      const repoId = targetDeployment.gitRepo.id;
      const existingRepo = combinedRepositories.get(repoId);

      if (existingRepo) {
        existingRepo.deployedRecipes.push(...targetDeployment.deployedRecipes);
        existingRepo.hasOutdatedRecipes =
          existingRepo.hasOutdatedRecipes ||
          targetDeployment.hasOutdatedRecipes;
        existingRepo.recipeTargets = existingRepo.recipeTargets || [];
        existingRepo.recipeTargets.push(targetDeployment);
      } else {
        combinedRepositories.set(repoId, {
          gitRepo: targetDeployment.gitRepo,
          deployedRecipes: [...targetDeployment.deployedRecipes],
          deployedStandards: [],
          hasOutdatedRecipes: targetDeployment.hasOutdatedRecipes,
          hasOutdatedStandards: false,
          recipeTargets: [targetDeployment],
          standardTargets: [],
        });
      }
    });

    // Process standard targets - group by repository
    standardTargets.forEach((targetDeployment) => {
      const repoId = targetDeployment.gitRepo.id;
      const existingRepo = combinedRepositories.get(repoId);

      if (existingRepo) {
        existingRepo.deployedStandards.push(
          ...targetDeployment.deployedStandards,
        );
        existingRepo.hasOutdatedStandards =
          existingRepo.hasOutdatedStandards ||
          targetDeployment.hasOutdatedStandards;
        existingRepo.standardTargets = existingRepo.standardTargets || [];
        existingRepo.standardTargets.push(targetDeployment);
      } else {
        combinedRepositories.set(repoId, {
          gitRepo: targetDeployment.gitRepo,
          deployedRecipes: [],
          deployedStandards: [...targetDeployment.deployedStandards],
          hasOutdatedRecipes: false,
          hasOutdatedStandards: targetDeployment.hasOutdatedStandards,
          recipeTargets: [],
          standardTargets: [targetDeployment],
        });
      }
    });
  } else {
    // Fallback to legacy repository-based data
    combinedRepositories = new Map<
      string,
      CombinedRepositoryDeploymentStatus
    >();

    // Add recipe repositories
    recipeRepositories.forEach((repo: RepositoryDeploymentStatus) => {
      combinedRepositories.set(repo.gitRepo.id, {
        gitRepo: repo.gitRepo,
        deployedRecipes: repo.deployedRecipes,
        deployedStandards: [],
        hasOutdatedRecipes: repo.hasOutdatedRecipes,
        hasOutdatedStandards: false,
      });
    });

    // Add or merge standard repositories
    standardRepositories.forEach((repo: RepositoryStandardDeploymentStatus) => {
      const existing = combinedRepositories.get(repo.gitRepo.id);
      if (existing) {
        existing.deployedStandards = repo.deployedStandards;
        existing.hasOutdatedStandards = repo.hasOutdatedStandards;
      } else {
        combinedRepositories.set(repo.gitRepo.id, {
          gitRepo: repo.gitRepo,
          deployedRecipes: [],
          deployedStandards: repo.deployedStandards,
          hasOutdatedRecipes: false,
          hasOutdatedStandards: repo.hasOutdatedStandards,
        });
      }
    });
  }

  const filteredRepositories = Array.from(combinedRepositories.values()).filter(
    (repository: CombinedRepositoryDeploymentStatus) => {
      // Apply target filter (OR logic for multiple targets)
      if (selectedTargetNames && selectedTargetNames.length > 0) {
        const hasAnySelectedTargetDeployments = selectedTargetNames.some(
          (targetName) =>
            repository.recipeTargets?.some(
              (t) => t.target.name === targetName,
            ) ||
            repository.standardTargets?.some(
              (t) => t.target.name === targetName,
            ),
        );

        if (!hasAnySelectedTargetDeployments) {
          return false;
        }
      }

      // Apply search filter
      if (searchTerm) {
        const fullName =
          `${repository.gitRepo.owner}/${repository.gitRepo.repo}`.toLowerCase();
        if (!fullName.includes(searchTerm.toLowerCase())) {
          return false;
        }
      }

      // Apply outdated filter (check if selected/visible targets are outdated)
      if (showOnlyOutdated) {
        // When using target-based data, check specific targets
        if (shouldUseTargetData) {
          const visibleRecipeTargets =
            selectedTargetNames && selectedTargetNames.length > 0
              ? repository.recipeTargets?.filter((t) =>
                  selectedTargetNames.includes(t.target.name),
                )
              : repository.recipeTargets;

          const visibleStandardTargets =
            selectedTargetNames && selectedTargetNames.length > 0
              ? repository.standardTargets?.filter((t) =>
                  selectedTargetNames.includes(t.target.name),
                )
              : repository.standardTargets;

          const hasOutdatedVisibleTargets =
            visibleRecipeTargets?.some((t) => t.hasOutdatedRecipes) ||
            visibleStandardTargets?.some((t) => t.hasOutdatedStandards);

          if (!hasOutdatedVisibleTargets) {
            return false;
          }
        } else {
          // Fallback to legacy repository-based check
          if (
            !repository.hasOutdatedRecipes &&
            !repository.hasOutdatedStandards
          ) {
            return false;
          }
        }
      }

      return true;
    },
  );

  if (filteredRepositories.length === 0) {
    if (selectedTargetNames && selectedTargetNames.length > 0 && searchTerm) {
      return (
        <PMEmptyState
          title="No repositories found"
          description={`No repositories match your search "${searchTerm}" for the selected targets`}
        />
      );
    }

    if (selectedTargetNames && selectedTargetNames.length > 0) {
      return (
        <PMEmptyState
          title="No repositories found"
          description="No repositories have deployments for the selected targets"
        />
      );
    }

    if (searchTerm) {
      return (
        <PMEmptyState
          title="No repositories found"
          description={`No repositories match your search "${searchTerm}"`}
        />
      );
    }

    if (showOnlyOutdated) {
      return (
        <PMEmptyState
          title="No outdated targets"
          description="All targets have up-to-date recipes and standards deployed"
        />
      );
    }

    return (
      <PMEmptyState
        title="No repositories"
        description="No repositories with deployed recipes or standards found"
      />
    );
  }

  return (
    <PMVStack gap={2} align="stretch">
      {filteredRepositories.map((repository) => {
        // Separate outdated and up-to-date recipes
        const outdatedRecipes = repository.deployedRecipes.filter(
          (recipe) => !recipe.isUpToDate,
        );
        const upToDateRecipes = repository.deployedRecipes.filter(
          (recipe) => recipe.isUpToDate,
        );

        // Separate outdated and up-to-date standards
        const outdatedStandards = repository.deployedStandards.filter(
          (standard) => !standard.isUpToDate,
        );
        const upToDateStandards = repository.deployedStandards.filter(
          (standard) => standard.isUpToDate,
        );

        const hasAnyDeployments =
          repository.deployedRecipes.length > 0 ||
          repository.deployedStandards.length > 0;

        // Check if we should render targets or legacy data
        const hasTargets =
          (repository.recipeTargets && repository.recipeTargets.length > 0) ||
          (repository.standardTargets && repository.standardTargets.length > 0);

        return (
          <PMVStack
            key={repository.gitRepo.id}
            p={4}
            borderWidth={1}
            borderRadius="md"
            backgroundColor={'background.primary'}
            alignItems={'stretch'}
            gap={'6'}
          >
            <PMHeading level="h4">
              {repository.gitRepo.owner}/{repository.gitRepo.repo}:
              {repository.gitRepo.branch}
            </PMHeading>

            {hasTargets ? (
              // Target-based rendering: group by targets within repository
              <>
                {/* Group all deployments by target */}
                {Array.from(
                  new Set([
                    ...(repository.recipeTargets?.map((t) => t.target.id) ||
                      []),
                    ...(repository.standardTargets?.map((t) => t.target.id) ||
                      []),
                  ]),
                )
                  .filter((targetId) => {
                    // Find recipe and standard deployments for this target
                    const recipeTarget = repository.recipeTargets?.find(
                      (t) => t.target.id === targetId,
                    );
                    const standardTarget = repository.standardTargets?.find(
                      (t) => t.target.id === targetId,
                    );
                    const target =
                      recipeTarget?.target || standardTarget?.target;

                    // Filter by selected target names
                    if (
                      selectedTargetNames &&
                      selectedTargetNames.length > 0 &&
                      target &&
                      !selectedTargetNames.includes(target.name)
                    ) {
                      return false;
                    }

                    // Filter by outdated status - skip targets that have no outdated items
                    if (showOnlyOutdated) {
                      const hasOutdatedRecipes =
                        recipeTarget?.hasOutdatedRecipes || false;
                      const hasOutdatedStandards =
                        standardTarget?.hasOutdatedStandards || false;

                      if (!hasOutdatedRecipes && !hasOutdatedStandards) {
                        return false;
                      }
                    }

                    return !!target;
                  })
                  .map((targetId) => {
                    // Find recipe and standard deployments for this target
                    const recipeTarget = repository.recipeTargets?.find(
                      (t) => t.target.id === targetId,
                    );
                    const standardTarget = repository.standardTargets?.find(
                      (t) => t.target.id === targetId,
                    );

                    // Get the target info (prefer recipe target, fallback to standard target)
                    const target =
                      recipeTarget?.target || standardTarget?.target;
                    if (!target) return null;

                    // Combine all deployments for this target
                    const allRecipes = recipeTarget?.deployedRecipes || [];
                    const allStandards =
                      standardTarget?.deployedStandards || [];

                    // Separate outdated and up-to-date for combined view
                    const outdatedItems = [
                      ...allRecipes
                        .filter((r) => !r.isUpToDate)
                        .map((r) => ({ ...r, type: 'recipe' as const })),
                      ...allStandards
                        .filter((s) => !s.isUpToDate)
                        .map((s) => ({ ...s, type: 'standard' as const })),
                    ];

                    const upToDateItems = [
                      ...allRecipes
                        .filter((r) => r.isUpToDate)
                        .map((r) => ({ ...r, type: 'recipe' as const })),
                      ...allStandards
                        .filter((s) => s.isUpToDate)
                        .map((s) => ({ ...s, type: 'standard' as const })),
                    ];

                    const hasTargetDeployments =
                      outdatedItems.length > 0 || upToDateItems.length > 0;

                    return (
                      <PMBox
                        key={`target-${targetId}`}
                        border={'solid 1px'}
                        borderColor={'border.tertiary'}
                        borderRadius={'sm'}
                        padding={4}
                        mb={4}
                      >
                        <PMVStack align="flex-start" gap={3} flex={1}>
                          <PMVStack align="flex-start" gap={0.5} flex={1}>
                            <PMHeading level="h5" color="secondary">
                              {target.name}
                            </PMHeading>
                            <PMHeading
                              level="h6"
                              color="faded"
                              textAlign="left"
                            >
                              Path: {target.path}
                            </PMHeading>
                          </PMVStack>

                          {/* Show empty state if this target has no deployments */}
                          {!hasTargetDeployments && (
                            <PMText variant="body" color="faded">
                              No recipes or standards deployed here
                            </PMText>
                          )}

                          {/* Outdated items in this target */}
                          {outdatedItems.length > 0 && (
                            <PMBox mb={2}>
                              <DeploymentItem
                                title={
                                  <PMHStack gap="1">
                                    <PMIcon color={'text.warning'}>
                                      <LuClockAlert />
                                    </PMIcon>
                                    <PMText>Outdated</PMText>
                                  </PMHStack>
                                }
                              >
                                {outdatedItems.map((item) => (
                                  <DeploymentEntry
                                    key={`${item.type}-${item.type === 'recipe' ? item.recipe.id : item.standard.id}-${targetId}`}
                                    name={
                                      <PMHStack alignItems={'baseline'}>
                                        <PMText>
                                          {item.type === 'recipe'
                                            ? item.recipe.name
                                            : item.standard.name}
                                        </PMText>
                                        <PMBadge
                                          color={
                                            item.type === 'recipe'
                                              ? undefined
                                              : 'blue.200'
                                          }
                                        >
                                          {item.type === 'recipe'
                                            ? 'Recipe'
                                            : 'Standard'}
                                        </PMBadge>
                                      </PMHStack>
                                    }
                                    versionInfo={`Current: v${item.deployedVersion.version} → Latest: v${item.latestVersion.version}`}
                                  />
                                ))}
                              </DeploymentItem>
                            </PMBox>
                          )}

                          {/* Up-to-date items in this target */}
                          {upToDateItems.length > 0 && (
                            <PMBox>
                              <DeploymentItem
                                title={
                                  <PMHStack gap="1">
                                    <PMIcon color={'text.success'}>
                                      <LuCircleCheckBig />
                                    </PMIcon>
                                    <PMText>Up-to-date</PMText>
                                  </PMHStack>
                                }
                              >
                                {upToDateItems.map((item) => (
                                  <DeploymentEntry
                                    key={`${item.type}-${item.type === 'recipe' ? item.recipe.id : item.standard.id}-${targetId}`}
                                    name={
                                      <PMHStack alignItems={'baseline'}>
                                        <PMText>
                                          {item.type === 'recipe'
                                            ? item.recipe.name
                                            : item.standard.name}
                                        </PMText>
                                        <PMBadge
                                          color={
                                            item.type === 'recipe'
                                              ? undefined
                                              : 'blue.200'
                                          }
                                        >
                                          {item.type === 'recipe'
                                            ? 'Recipe'
                                            : 'Standard'}
                                        </PMBadge>
                                      </PMHStack>
                                    }
                                    versionInfo={`Version: v${item.deployedVersion.version}`}
                                  />
                                ))}
                              </DeploymentItem>
                            </PMBox>
                          )}
                        </PMVStack>
                      </PMBox>
                    );
                  })}
              </>
            ) : (
              // Legacy repository-based rendering
              <>
                {/* Outdated deployments first */}
                {(outdatedRecipes.length > 0 ||
                  outdatedStandards.length > 0) && (
                  <PMBox>
                    <DeploymentItem
                      title={
                        <PMHStack gap="1">
                          <PMIcon color={'text.warning'}>
                            <LuClockAlert />
                          </PMIcon>
                          <PMText>Outdated</PMText>
                        </PMHStack>
                      }
                    >
                      {outdatedRecipes.map((deployedRecipe) => (
                        <DeploymentEntry
                          key={`recipe-${deployedRecipe.recipe.id}`}
                          name={
                            <PMHStack
                              alignItems={'baseline'}
                              data-testid={`recipe-${deployedRecipe.recipe.id}`}
                            >
                              <PMText>{deployedRecipe.recipe.name}</PMText>
                              <PMBadge>Recipe</PMBadge>
                            </PMHStack>
                          }
                          versionInfo={`Current: v${deployedRecipe.deployedVersion.version} → Latest: v${deployedRecipe.latestVersion.version}`}
                        />
                      ))}
                      {outdatedStandards.map((deployedStandard) => (
                        <DeploymentEntry
                          key={`standard-${deployedStandard.standard.id}`}
                          name={
                            <PMHStack
                              alignItems={'baseline'}
                              data-testid={`standard-${deployedStandard.standard.id}`}
                            >
                              <PMText>{deployedStandard.standard.name}</PMText>
                              <PMBadge color={'blue.200'}>Standard</PMBadge>
                            </PMHStack>
                          }
                          versionInfo={`Current: v${deployedStandard.deployedVersion.version} → Latest: v${deployedStandard.latestVersion.version}`}
                        />
                      ))}
                    </DeploymentItem>
                  </PMBox>
                )}

                {/* Up-to-date deployments */}
                {(upToDateRecipes.length > 0 ||
                  upToDateStandards.length > 0) && (
                  <PMBox>
                    <DeploymentItem
                      title={
                        <PMHStack gap="1">
                          <PMIcon color={'text.success'}>
                            <LuCircleCheckBig />
                          </PMIcon>
                          <PMText>Up-to-date</PMText>
                        </PMHStack>
                      }
                    >
                      {upToDateRecipes.map((deployedRecipe) => (
                        <DeploymentEntry
                          key={`recipe-${deployedRecipe.recipe.id}`}
                          name={
                            <PMHStack
                              alignItems={'baseline'}
                              data-testid={`recipe-${deployedRecipe.recipe.id}`}
                            >
                              <PMText>{deployedRecipe.recipe.name}</PMText>
                              <PMBadge>Recipe</PMBadge>
                            </PMHStack>
                          }
                          versionInfo={`Version: v${deployedRecipe.deployedVersion.version}`}
                        />
                      ))}
                      {upToDateStandards.map((deployedStandard) => (
                        <DeploymentEntry
                          key={`standard-${deployedStandard.standard.id}`}
                          name={
                            <PMHStack
                              alignItems={'baseline'}
                              data-testid={`standard-${deployedStandard.standard.id}`}
                            >
                              <PMText>{deployedStandard.standard.name}</PMText>
                              <PMBadge color={'blue.200'}>Standard</PMBadge>
                            </PMHStack>
                          }
                          versionInfo={`Version: v${deployedStandard.deployedVersion.version}`}
                        />
                      ))}
                    </DeploymentItem>
                  </PMBox>
                )}

                {!hasAnyDeployments && (
                  <PMBox>
                    <PMBox mb={2}>
                      <PMText variant="body" color="faded">
                        No recipes or standards deployed here
                      </PMText>
                    </PMBox>
                  </PMBox>
                )}
              </>
            )}
          </PMVStack>
        );
      })}
    </PMVStack>
  );
};
