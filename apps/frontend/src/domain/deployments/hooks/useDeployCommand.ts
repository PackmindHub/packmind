import { useCallback } from 'react';
import { commandsGateway } from '../../commands/api/gateways';
import { CommandId, CommandVersionId } from '@packmind/types';
import { OrganizationId } from '@packmind/types';
import { SpaceId, TargetId } from '@packmind/types';
import { useDeployCommandsMutation } from '../api/queries/DeploymentsQueries';

interface DeployParams {
  organizationId: OrganizationId;
  spaceId: SpaceId;
  id: CommandId;
  version: number;
  name?: string;
}

interface BatchDeployParams {
  recipes: DeployParams[];
}

// Helper function to get RecipeVersionId from recipeId and version
const getCommandVersionId = async (
  organizationId: OrganizationId,
  spaceId: SpaceId,
  recipeId: CommandId,
  version: number,
): Promise<CommandVersionId | null> => {
  try {
    // Get all versions for the recipe
    const versions = await commandsGateway.getVersionsById(
      organizationId,
      spaceId,
      recipeId,
    );

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

export const useDeployCommand = () => {
  const publishMutation = useDeployCommandsMutation();

  const deployToTargets = useCallback(
    async (params: DeployParams, targetIds: TargetId[]) => {
      // Get the RecipeVersionId for this recipe and version
      const recipeVersionId = await getCommandVersionId(
        params.organizationId,
        params.spaceId,
        params.id,
        params.version,
      );

      if (!recipeVersionId) {
        throw new Error(
          `Could not find version ${params.version} for recipe ${params.id}`,
        );
      }

      // Deploy the recipe using the RecipeVersionId
      const deployments = await publishMutation.mutateAsync({
        commandVersionIds: [recipeVersionId],
        targetIds: targetIds,
      });

      const commandName = params.name || params.id;
      console.log(
        `Recipe ${commandName} v${params.version} distributed to ${targetIds.length} targets successfully`,
      );

      return deployments;
    },
    [publishMutation],
  );

  const deploySingle = useCallback(
    async (params: DeployParams, targetIds: TargetId[]) => {
      try {
        if (!targetIds.length) {
          throw new Error('Target IDs array cannot be empty');
        } else {
          return await deployToTargets(params, targetIds);
        }
      } catch (error) {
        const commandName = params.name || params.id;
        console.error(
          `Failed to deploy recipe ${commandName} v${params.version}:`,
          error,
        );
        throw error;
      }
    },
    [deployToTargets],
  );

  const deployBatch = useCallback(
    async (batchParams: BatchDeployParams, targetIds: TargetId[]) => {
      try {
        if (!targetIds.length) {
          throw new Error('Target IDs array cannot be empty');
        } else {
          console.log('Deploying batch of recipes to targets:', targetIds);

          // Get RecipeVersionIds for all recipes in the batch
          const commandVersionIdsPromises = batchParams.recipes.map(
            async (deployParams) => {
              const recipeVersionId = await getCommandVersionId(
                deployParams.organizationId,
                deployParams.spaceId,
                deployParams.id,
                deployParams.version,
              );
              if (!recipeVersionId) {
                console.warn(
                  `Could not find version ${deployParams.version} for recipe ${deployParams.id}, skipping`,
                );
              }
              return { recipeVersionId, recipe: deployParams };
            },
          );

          const results = await Promise.all(commandVersionIdsPromises);

          const validResults = results.filter(
            (result) => result.recipeVersionId !== null,
          );

          if (validResults.length === 0) {
            throw new Error('No valid recipe versions found for deployment');
          }

          const commandVersionIds = validResults.map(
            (result) => result.recipeVersionId as CommandVersionId,
          );

          const deployments = await publishMutation.mutateAsync({
            commandVersionIds,
            targetIds,
          });

          console.log(
            `${validResults.length} recipes distributed to ${targetIds.length} targets successfully`,
          );

          // Log any skipped recipes
          const skippedCount = batchParams.recipes.length - validResults.length;
          if (skippedCount > 0) {
            console.warn(
              `${skippedCount} recipes were skipped due to missing version information`,
            );
          }

          return deployments;
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
