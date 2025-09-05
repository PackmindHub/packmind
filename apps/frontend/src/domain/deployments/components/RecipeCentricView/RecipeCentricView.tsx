import React from 'react';
import { PMBox, PMHeading, PMVStack, PMText, PMEmptyState } from '@packmind/ui';
import {
  DeploymentItem,
  DeploymentEntry,
} from '../DeploymentItem/DeploymentItem';
import { RecipeDeploymentStatus } from '@packmind/shared/types';

interface RecipeCentricViewProps {
  recipes: RecipeDeploymentStatus[];
  searchTerm?: string;
  showOnlyOutdated?: boolean;
  showOnlyUndeployed?: boolean;
}

export const RecipeCentricView: React.FC<RecipeCentricViewProps> = ({
  recipes,
  searchTerm = '',
  showOnlyOutdated = false,
  showOnlyUndeployed = false,
}) => {
  const filteredRecipes = recipes.filter((recipeDeployment) => {
    // Apply search filter
    if (searchTerm) {
      const recipeName = recipeDeployment.recipe.name.toLowerCase();
      if (!recipeName.includes(searchTerm.toLowerCase())) {
        return false;
      }
    }

    // Apply outdated filter
    if (showOnlyOutdated && !recipeDeployment.hasOutdatedDeployments) {
      return false;
    }

    // Apply undeployed filter
    if (showOnlyUndeployed && recipeDeployment.deployments.length > 0) {
      return false;
    }

    return true;
  });

  if (filteredRecipes.length === 0) {
    if (searchTerm) {
      return (
        <PMEmptyState
          title="No recipes found"
          description={`No recipes match your search "${searchTerm}"`}
        />
      );
    }

    if (showOnlyOutdated) {
      return (
        <PMEmptyState
          title="No outdated recipes"
          description="All recipes have up-to-date deployments"
        />
      );
    }

    if (showOnlyUndeployed) {
      return (
        <PMEmptyState
          title="No undeployed recipes"
          description="All recipes have been deployed to at least one repository"
        />
      );
    }

    return (
      <PMEmptyState
        title="No recipes"
        description="No recipes found in your organization"
      />
    );
  }

  return (
    <PMVStack gap={2} align="stretch">
      {filteredRecipes.map((recipeDeployment) => {
        // Separate outdated and up-to-date deployments
        const outdatedDeployments = recipeDeployment.deployments.filter(
          (deployment) => !deployment.isUpToDate,
        );
        const upToDateDeployments = recipeDeployment.deployments.filter(
          (deployment) => deployment.isUpToDate,
        );

        return (
          <PMBox
            key={recipeDeployment.recipe.id}
            p={4}
            borderWidth={1}
            borderRadius="md"
            backgroundColor={'background.primary'}
          >
            <PMBox mb={3}>
              <PMHeading level="h4">{recipeDeployment.recipe.name}</PMHeading>
            </PMBox>

            {/* Outdated deployments first */}
            {outdatedDeployments.length > 0 && (
              <PMBox mb={4}>
                <DeploymentItem title="❌ Outdated">
                  {outdatedDeployments.map((deployment) => (
                    <DeploymentEntry
                      key={deployment.gitRepo.id}
                      name={`${deployment.gitRepo.owner}/${deployment.gitRepo.repo}`}
                      versionInfo={`Current: v${deployment.deployedVersion.version} → Latest: v${recipeDeployment.latestVersion.version}`}
                    />
                  ))}
                </DeploymentItem>
              </PMBox>
            )}

            {/* Up-to-date deployments */}
            {upToDateDeployments.length > 0 && (
              <PMBox>
                <DeploymentItem title="✅ Up-to-date">
                  {upToDateDeployments.map((deployment) => (
                    <DeploymentEntry
                      key={deployment.gitRepo.id}
                      name={`${deployment.gitRepo.owner}/${deployment.gitRepo.repo}`}
                      versionInfo={`Version: v${deployment.deployedVersion.version}`}
                    />
                  ))}
                </DeploymentItem>
              </PMBox>
            )}

            {recipeDeployment.deployments.length === 0 && (
              <PMBox>
                <PMBox mb={2}>
                  <PMText variant="body" color="faded">
                    This recipe has not been deployed yet
                  </PMText>
                </PMBox>
              </PMBox>
            )}
          </PMBox>
        );
      })}
    </PMVStack>
  );
};
