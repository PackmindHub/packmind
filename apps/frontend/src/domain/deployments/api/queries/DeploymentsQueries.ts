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
} from '@packmind/shared';

export const LIST_RECIPE_DEPLOYMENTS_QUERY_KEY = 'recipeDeployments';
export const useListRecipeDeploymentsQuery = (recipeId: RecipeId) => {
  return useQuery({
    queryKey: [LIST_RECIPE_DEPLOYMENTS_QUERY_KEY, recipeId],
    queryFn: () => {
      return deploymentsGateways.listDeploymentsByRecipeId({ recipeId });
    },
  });
};

export const LIST_STANDARD_DEPLOYMENTS_QUERY_KEY = 'standardDeployments';
export const useListStandardDeploymentsQuery = (standardId: StandardId) => {
  return useQuery({
    queryKey: [LIST_STANDARD_DEPLOYMENTS_QUERY_KEY, standardId],
    queryFn: () => {
      return deploymentsGateways.listDeploymentsByStandardId({ standardId });
    },
  });
};

export const GET_RECIPES_DEPLOYMENT_OVERVIEW_QUERY_KEY =
  'recipeDeploymentOverview';
export const useGetRecipesDeploymentOverviewQuery = () => {
  return useQuery({
    queryKey: [GET_RECIPES_DEPLOYMENT_OVERVIEW_QUERY_KEY],
    queryFn: () => {
      return deploymentsGateways.getRecipesDeploymentOverview({});
    },
  });
};

export const GET_STANDARDS_DEPLOYMENT_OVERVIEW_QUERY_KEY =
  'standardsDeploymentOverview';
export const useGetStandardsDeploymentOverviewQuery = () => {
  return useQuery({
    queryKey: [GET_STANDARDS_DEPLOYMENT_OVERVIEW_QUERY_KEY],
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
        queryKey: [LIST_RECIPE_DEPLOYMENTS_QUERY_KEY],
      });

      await queryClient.invalidateQueries({
        queryKey: [GET_RECIPES_DEPLOYMENT_OVERVIEW_QUERY_KEY],
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
        queryKey: [LIST_STANDARD_DEPLOYMENTS_QUERY_KEY],
      });
      await queryClient.invalidateQueries({
        queryKey: [GET_STANDARDS_DEPLOYMENT_OVERVIEW_QUERY_KEY],
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

export const GET_TARGETS_BY_GIT_REPO_QUERY_KEY = 'targetsByGitRepo';
export const useGetTargetsByGitRepoQuery = (gitRepoId: GitRepoId) => {
  return useQuery({
    queryKey: [GET_TARGETS_BY_GIT_REPO_QUERY_KEY, gitRepoId],
    queryFn: () => {
      return deploymentsGateways.getTargetsByGitRepo({ gitRepoId });
    },
    enabled: !!gitRepoId,
  });
};

export const GET_TARGETS_BY_REPOSITORY_QUERY_KEY = 'targetsByRepository';
export const useGetTargetsByRepositoryQuery = (owner: string, repo: string) => {
  return useQuery({
    queryKey: [GET_TARGETS_BY_REPOSITORY_QUERY_KEY, owner, repo],
    queryFn: () => {
      return deploymentsGateways.getTargetsByRepository({ owner, repo });
    },
    enabled: !!owner && !!repo,
  });
};

export const GET_TARGETS_BY_ORGANIZATION_QUERY_KEY = 'targetsByOrganization';
export const useGetTargetsByOrganizationQuery = (
  organizationId: OrganizationId,
) => {
  return useQuery({
    queryKey: [GET_TARGETS_BY_ORGANIZATION_QUERY_KEY, organizationId],
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
      // Invalidate targets queries to refetch updated data
      await queryClient.invalidateQueries({
        queryKey: [GET_TARGETS_BY_REPOSITORY_QUERY_KEY, newTarget.gitRepoId],
      });

      await queryClient.invalidateQueries({
        queryKey: [GET_TARGETS_BY_ORGANIZATION_QUERY_KEY],
      });

      // Also invalidate deployment overviews since targets affect deployments
      await queryClient.invalidateQueries({
        queryKey: [GET_RECIPES_DEPLOYMENT_OVERVIEW_QUERY_KEY],
      });

      await queryClient.invalidateQueries({
        queryKey: [GET_STANDARDS_DEPLOYMENT_OVERVIEW_QUERY_KEY],
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
      // Invalidate targets queries to refetch updated data
      await queryClient.invalidateQueries({
        queryKey: [
          GET_TARGETS_BY_REPOSITORY_QUERY_KEY,
          updatedTarget.gitRepoId,
        ],
      });

      await queryClient.invalidateQueries({
        queryKey: [GET_TARGETS_BY_ORGANIZATION_QUERY_KEY],
      });

      // Also invalidate deployment overviews since targets affect deployments
      await queryClient.invalidateQueries({
        queryKey: [GET_RECIPES_DEPLOYMENT_OVERVIEW_QUERY_KEY],
      });

      await queryClient.invalidateQueries({
        queryKey: [GET_STANDARDS_DEPLOYMENT_OVERVIEW_QUERY_KEY],
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
    onSuccess: async (_, deletedCommand) => {
      // We need to invalidate all target queries since we don't know which repository the deleted target belonged to
      // This is less efficient but ensures consistency
      await queryClient.invalidateQueries({
        queryKey: [GET_TARGETS_BY_REPOSITORY_QUERY_KEY],
      });

      await queryClient.invalidateQueries({
        queryKey: [GET_TARGETS_BY_ORGANIZATION_QUERY_KEY],
      });

      // Also invalidate deployment overviews since targets affect deployments
      await queryClient.invalidateQueries({
        queryKey: [GET_RECIPES_DEPLOYMENT_OVERVIEW_QUERY_KEY],
      });

      await queryClient.invalidateQueries({
        queryKey: [GET_STANDARDS_DEPLOYMENT_OVERVIEW_QUERY_KEY],
      });

      console.log(`Target ${deletedCommand.targetId} deleted successfully`);
    },
    onError: (error) => {
      console.error('Error deleting target:', error);
    },
  });
};
