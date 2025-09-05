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
} from '@packmind/shared';
import { LuCircleCheckBig, LuClockAlert } from 'react-icons/lu';

interface CombinedRepositoryDeploymentStatus {
  gitRepo: GitRepo;
  deployedRecipes: DeployedRecipeInfo[];
  deployedStandards: DeployedStandardInfo[];
  hasOutdatedRecipes: boolean;
  hasOutdatedStandards: boolean;
}

interface RepositoryCentricViewProps {
  recipeRepositories: RepositoryDeploymentStatus[];
  standardRepositories?: RepositoryStandardDeploymentStatus[];
  searchTerm?: string;
  showOnlyOutdated?: boolean;
}

export const RepositoryCentricView: React.FC<RepositoryCentricViewProps> = ({
  recipeRepositories,
  standardRepositories = [],
  searchTerm = '',
  showOnlyOutdated = false,
}) => {
  // Combine repositories by gitRepo.id
  const combinedRepositories = new Map<
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

  const filteredRepositories = Array.from(combinedRepositories.values()).filter(
    (repository: CombinedRepositoryDeploymentStatus) => {
      // Apply search filter
      if (searchTerm) {
        const fullName =
          `${repository.gitRepo.owner}/${repository.gitRepo.repo}`.toLowerCase();
        if (!fullName.includes(searchTerm.toLowerCase())) {
          return false;
        }
      }

      // Apply outdated filter (outdated if has outdated recipes OR standards)
      if (
        showOnlyOutdated &&
        !repository.hasOutdatedRecipes &&
        !repository.hasOutdatedStandards
      ) {
        return false;
      }

      return true;
    },
  );

  if (filteredRepositories.length === 0) {
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
          title="No outdated repositories"
          description="All repositories have up-to-date recipes and standards deployed"
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
              {repository.gitRepo.owner}/{repository.gitRepo.repo}
            </PMHeading>

            {/* Outdated deployments first */}
            {(outdatedRecipes.length > 0 || outdatedStandards.length > 0) && (
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
            {(upToDateRecipes.length > 0 || upToDateStandards.length > 0) && (
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
          </PMVStack>
        );
      })}
    </PMVStack>
  );
};
