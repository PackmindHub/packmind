import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deploymentsGateways } from '../gateways';
import { RecipeId, RecipeVersionId } from '@packmind/recipes/types';
import { StandardId, StandardVersionId } from '@packmind/standards/types';
import { GitRepoId } from '@packmind/git';

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
      gitRepoIds,
    }: {
      recipeVersionIds: RecipeVersionId[];
      gitRepoIds: GitRepoId[];
    }) => {
      console.log('Publishing recipes to git...');
      return deploymentsGateways.publishRecipes({
        recipeVersionIds,
        gitRepoIds,
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
      gitRepoIds,
    }: {
      standardVersionIds: StandardVersionId[];
      gitRepoIds: GitRepoId[];
    }) => {
      console.log('Deploying standards to git...');
      return deploymentsGateways.publishStandards({
        standardVersionIds,
        gitRepoIds,
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
