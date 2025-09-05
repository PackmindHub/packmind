import { useCallback } from 'react';
import { recipesGateway } from '../../recipes/api/gateways';
import { GitRepoId } from '@packmind/git/types';
import { RecipeId, RecipeVersionId } from '@packmind/recipes/types';
import { useDeployRecipesMutation } from '../api/queries/DeploymentsQueries';

interface DeployParams {
  id: RecipeId;
  version: number;
  name?: string;
}

interface BatchDeployParams {
  recipes: DeployParams[];
}

// Helper function to get RecipeVersionId from recipeId and version
const getRecipeVersionId = async (
  recipeId: RecipeId,
  version: number,
): Promise<RecipeVersionId | null> => {
  try {
    // Get all versions for the recipe
    const versions = await recipesGateway.getVersionsById(recipeId);

    // Find the version with the matching version number
    const recipeVersion = versions.find((v) => v.version === version);

    // Return the RecipeVersionId if found, null otherwise
    return recipeVersion ? recipeVersion.id : null;
  } catch (error) {
    console.error(
      `Failed to get RecipeVersionId for recipe ${recipeId} version ${version}:`,
      error,
    );
    return null;
  }
};

export const useDeployRecipe = () => {
  const publishMutation = useDeployRecipesMutation();

  const deployToRepository = useCallback(
    async (params: DeployParams, gitRepoIds: GitRepoId[]) => {
      // Get the RecipeVersionId for this recipe and version
      const recipeVersionId = await getRecipeVersionId(
        params.id,
        params.version,
      );

      if (!recipeVersionId) {
        throw new Error(
          `Could not find version ${params.version} for recipe ${params.id}`,
        );
      }

      // Deploy the recipe using the RecipeVersionId
      await publishMutation.mutateAsync({
        recipeVersionIds: [recipeVersionId],
        gitRepoIds: gitRepoIds,
      });

      const recipeName = params.name || params.id;
      console.log(
        `Recipe ${recipeName} v${params.version} deployed to ${gitRepoIds.length} repositories successfully`,
      );
    },
    [publishMutation],
  );

  const deploySingle = useCallback(
    async (params: DeployParams, repositoryIds: GitRepoId[]) => {
      try {
        if (!repositoryIds.length) {
          throw new Error('Repository IDs array cannot be empty');
        } else {
          await deployToRepository(params, repositoryIds);
        }
      } catch (error) {
        const recipeName = params.name || params.id;
        console.error(
          `Failed to deploy recipe ${recipeName} v${params.version}:`,
          error,
        );
        throw error;
      }
    },
    [deployToRepository],
  );

  const deployBatch = useCallback(
    async (batchParams: BatchDeployParams, gitRepoIds: GitRepoId[]) => {
      try {
        if (!gitRepoIds.length) {
          throw new Error('Repository IDs array cannot be empty');
        } else {
          console.log(
            'Deploying batch of recipes to repositories:',
            gitRepoIds,
          );

          // Get RecipeVersionIds for all recipes in the batch
          const recipeVersionIdsPromises = batchParams.recipes.map(
            async (recipe) => {
              const recipeVersionId = await getRecipeVersionId(
                recipe.id,
                recipe.version,
              );
              if (!recipeVersionId) {
                console.warn(
                  `Could not find version ${recipe.version} for recipe ${recipe.id}, skipping`,
                );
              }
              return { recipeVersionId, recipe };
            },
          );

          const results = await Promise.all(recipeVersionIdsPromises);

          const validResults = results.filter(
            (result) => result.recipeVersionId !== null,
          );

          if (validResults.length === 0) {
            throw new Error('No valid recipe versions found for deployment');
          }

          const recipeVersionIds = validResults.map(
            (result) => result.recipeVersionId as RecipeVersionId,
          );

          await publishMutation.mutateAsync({
            recipeVersionIds,
            gitRepoIds,
          });

          console.log(
            `${validResults.length} recipes deployed to ${gitRepoIds.length} repositories successfully`,
          );

          // Log any skipped recipes
          const skippedCount = batchParams.recipes.length - validResults.length;
          if (skippedCount > 0) {
            console.warn(
              `${skippedCount} recipes were skipped due to missing version information`,
            );
          }
        }
      } catch (error) {
        console.error(`Failed to deploy selected recipes:`, error);
        throw error;
      }
    },
    [publishMutation],
  );

  return {
    deployRecipe: deploySingle,
    deployRecipes: deployBatch,
    isDeploying: publishMutation.isPending,
    publishMutation, // Expose for components that need direct access to single recipe publishing
    publishMultipleMutation: publishMutation, // Expose for components that need direct access to multiple recipe publishing
  };
};
