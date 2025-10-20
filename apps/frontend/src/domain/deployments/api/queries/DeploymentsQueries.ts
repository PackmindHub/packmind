import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deploymentsGateways } from '../gateways';
import { RecipeId, RecipeVersionId } from '@packmind/recipes/types';
import { StandardId, StandardVersionId } from '@packmind/standards/types';
import { GitRepoId } from '@packmind/git';
import { OrganizationId } from '@packmind/accounts';
import {
  TargetId,
  AddTargetCommand,
  UpdateTargetCommand,
  DeleteTargetCommand,
  DeleteTargetResponse,
  UpdateRenderModeConfigurationCommand,
} from '@packmind/shared';
import {
  LIST_RECIPE_DEPLOYMENTS_KEY,
  LIST_STANDARD_DEPLOYMENTS_KEY,
  GET_RECIPES_DEPLOYMENT_OVERVIEW_KEY,
  GET_STANDARDS_DEPLOYMENT_OVERVIEW_KEY,
  GET_TARGETS_BY_GIT_REPO_KEY,
  GET_TARGETS_BY_REPOSITORY_KEY,
  GET_TARGETS_BY_ORGANIZATION_KEY,
  GET_RENDER_MODE_CONFIGURATION_KEY,
} from '../queryKeys';
export const useListRecipeDeploymentsQuery = (recipeId: RecipeId) => {
  return useQuery({
    queryKey: [...LIST_RECIPE_DEPLOYMENTS_KEY, recipeId],
    queryFn: () => {
      return deploymentsGateways.listDeploymentsByRecipeId({ recipeId });
    },
  });
};

export const useListStandardDeploymentsQuery = (standardId: StandardId) => {
  return useQuery({
    queryKey: [...LIST_STANDARD_DEPLOYMENTS_KEY, standardId],
    queryFn: () => {
      return deploymentsGateways.listDeploymentsByStandardId({ standardId });
    },
  });
};

export const useGetRecipesDeploymentOverviewQuery = () => {
  return useQuery({
    queryKey: GET_RECIPES_DEPLOYMENT_OVERVIEW_KEY,
    queryFn: () => {
      return deploymentsGateways.getRecipesDeploymentOverview({});
    },
  });
};

export const useGetStandardsDeploymentOverviewQuery = () => {
  return useQuery({
    queryKey: GET_STANDARDS_DEPLOYMENT_OVERVIEW_KEY,
    queryFn: () => {
      return deploymentsGateways.getStandardsDeploymentOverview({});
    },
  });
};

export const DEPLOY_RECIPES_MUTATION_KEY = 'deployRecipes';
export const useDeployRecipesMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [DEPLOY_RECIPES_MUTATION_KEY],
    mutationFn: async ({
      recipeVersionIds,
      targetIds,
    }: {
      recipeVersionIds: RecipeVersionId[];
      targetIds: TargetId[];
    }) => {
      console.log('Publishing recipes to targets...');
      return deploymentsGateways.publishRecipes({
        recipeVersionIds,
        targetIds,
      });
    },
    onSuccess: async () => {
      // We need to invalidate queries, but we don't have recipeIds directly
      // For now, we'll invalidate all recipes queries
      await queryClient.invalidateQueries({
        queryKey: LIST_RECIPE_DEPLOYMENTS_KEY,
      });

      await queryClient.invalidateQueries({
        queryKey: GET_RECIPES_DEPLOYMENT_OVERVIEW_KEY,
      });

      // If we have specific recipe IDs in the future, we can invalidate them individually
    },
    onError: async (error, variables, context) => {
      console.error('Error publishing recipes to git');
      console.log('error: ', error);
      console.log('variables: ', variables);
      console.log('context: ', context);
    },
  });
};

export const DEPLOY_STANDARDS_MUTATION_KEY = 'deployStandards';
export const useDeployStandardsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [DEPLOY_STANDARDS_MUTATION_KEY],
    mutationFn: async ({
      standardVersionIds,
      targetIds,
    }: {
      standardVersionIds: StandardVersionId[];
      targetIds: TargetId[];
    }) => {
      console.log('Deploying standards to targets...');
      return deploymentsGateways.publishStandards({
        standardVersionIds,
        targetIds,
      });
    },
    onSuccess: async () => {
      // We need to invalidate queries, but we don't have standardIds directly
      // For now, we'll invalidate all standards queries
      await queryClient.invalidateQueries({
        queryKey: LIST_STANDARD_DEPLOYMENTS_KEY,
      });
      await queryClient.invalidateQueries({
        queryKey: GET_STANDARDS_DEPLOYMENT_OVERVIEW_KEY,
      });

      // If we have specific standard IDs in the future, we can invalidate them individually
    },
    onError: async (error, variables, context) => {
      console.error('Error deploying standards to git');
      console.log('error: ', error);
      console.log('variables: ', variables);
      console.log('context: ', context);
    },
  });
};

export const useGetTargetsByGitRepoQuery = (gitRepoId: GitRepoId) => {
  return useQuery({
    queryKey: [...GET_TARGETS_BY_GIT_REPO_KEY, gitRepoId],
    queryFn: () => {
      return deploymentsGateways.getTargetsByGitRepo({ gitRepoId });
    },
    enabled: !!gitRepoId,
  });
};

export const useGetTargetsByRepositoryQuery = (owner: string, repo: string) => {
  return useQuery({
    queryKey: [...GET_TARGETS_BY_REPOSITORY_KEY, owner, repo],
    queryFn: () => {
      return deploymentsGateways.getTargetsByRepository({ owner, repo });
    },
    enabled: !!owner && !!repo,
  });
};

export const useGetTargetsByOrganizationQuery = (
  organizationId: OrganizationId,
) => {
  return useQuery({
    queryKey: [...GET_TARGETS_BY_ORGANIZATION_KEY, organizationId],
    queryFn: () => {
      return deploymentsGateways.getTargetsByOrganization({ organizationId });
    },
  });
};

export const ADD_TARGET_MUTATION_KEY = 'addTarget';
export const useAddTargetMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [ADD_TARGET_MUTATION_KEY],
    mutationFn: async (
      command: Omit<AddTargetCommand, 'userId' | 'organizationId'>,
    ) => {
      return deploymentsGateways.addTarget(command);
    },
    onSuccess: async (newTarget) => {
      // Invalidate all target queries (simpler)
      await queryClient.invalidateQueries({
        queryKey: GET_TARGETS_BY_REPOSITORY_KEY,
      });
      await queryClient.invalidateQueries({
        queryKey: GET_TARGETS_BY_ORGANIZATION_KEY,
      });

      // Invalidate all deployment overviews (new target available for both)
      await queryClient.invalidateQueries({
        queryKey: GET_RECIPES_DEPLOYMENT_OVERVIEW_KEY,
      });
      await queryClient.invalidateQueries({
        queryKey: GET_STANDARDS_DEPLOYMENT_OVERVIEW_KEY,
      });
    },
    onError: (error) => {
      console.error('Error adding target:', error);
    },
  });
};

export const UPDATE_TARGET_MUTATION_KEY = 'updateTarget';
export const useUpdateTargetMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [UPDATE_TARGET_MUTATION_KEY],
    mutationFn: async (
      command: Omit<UpdateTargetCommand, 'userId' | 'organizationId'>,
    ) => {
      return deploymentsGateways.updateTarget(command);
    },
    onSuccess: async (updatedTarget) => {
      // Same as useAddTargetMutation
      await queryClient.invalidateQueries({
        queryKey: GET_TARGETS_BY_REPOSITORY_KEY,
      });
      await queryClient.invalidateQueries({
        queryKey: GET_TARGETS_BY_ORGANIZATION_KEY,
      });

      await queryClient.invalidateQueries({
        queryKey: GET_RECIPES_DEPLOYMENT_OVERVIEW_KEY,
      });
      await queryClient.invalidateQueries({
        queryKey: GET_STANDARDS_DEPLOYMENT_OVERVIEW_KEY,
      });
    },
    onError: (error) => {
      console.error('Error updating target:', error);
    },
  });
};

export const DELETE_TARGET_MUTATION_KEY = 'deleteTarget';
export const useDeleteTargetMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [DELETE_TARGET_MUTATION_KEY],
    mutationFn: async (
      command: Omit<DeleteTargetCommand, 'userId' | 'organizationId'>,
    ): Promise<DeleteTargetResponse> => {
      return deploymentsGateways.deleteTarget(command);
    },
    onSuccess: async () => {
      // Current is correct - target deleted affects all target queries
      // and deployment overviews
      await queryClient.invalidateQueries({
        queryKey: GET_TARGETS_BY_REPOSITORY_KEY,
      });
      await queryClient.invalidateQueries({
        queryKey: GET_TARGETS_BY_ORGANIZATION_KEY,
      });

      await queryClient.invalidateQueries({
        queryKey: GET_RECIPES_DEPLOYMENT_OVERVIEW_KEY,
      });
      await queryClient.invalidateQueries({
        queryKey: GET_STANDARDS_DEPLOYMENT_OVERVIEW_KEY,
      });
    },
    onError: (error) => {
      console.error('Error deleting target:', error);
    },
  });
};

export const useGetRenderModeConfigurationQuery = () => {
  return useQuery({
    queryKey: GET_RENDER_MODE_CONFIGURATION_KEY,
    queryFn: () => {
      return deploymentsGateways.getRenderModeConfiguration({});
    },
  });
};

export const UPDATE_RENDER_MODE_CONFIGURATION_MUTATION_KEY =
  'updateRenderModeConfiguration';
export const useUpdateRenderModeConfigurationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [UPDATE_RENDER_MODE_CONFIGURATION_MUTATION_KEY],
    mutationFn: async (
      command: Omit<
        UpdateRenderModeConfigurationCommand,
        'userId' | 'organizationId'
      >,
    ) => {
      return deploymentsGateways.updateRenderModeConfiguration(command);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: GET_RENDER_MODE_CONFIGURATION_KEY,
      });
    },
    onError: (error) => {
      console.error('Error updating render mode configuration:', error);
    },
  });
};
