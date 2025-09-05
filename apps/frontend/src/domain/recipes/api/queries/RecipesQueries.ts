import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { recipesGateway } from '../gateways';
import { RecipeId } from '@packmind/recipes/types';
import { GET_RECIPES_DEPLOYMENT_OVERVIEW_QUERY_KEY } from '../../../deployments/api/queries/DeploymentsQueries';

const GET_RECIPES_QUERY_KEY = 'recipes';

export const useGetRecipesQuery = () => {
  return useQuery({
    queryKey: [GET_RECIPES_QUERY_KEY],
    queryFn: () => {
      return recipesGateway.getRecipes();
    },
  });
};

const GET_RECIPE_BY_ID_QUERY_KEY = 'recipe';

export const useGetRecipeByIdQuery = (id: RecipeId) => {
  return useQuery({
    queryKey: [GET_RECIPE_BY_ID_QUERY_KEY, id],
    queryFn: () => {
      return recipesGateway.getRecipeById(id);
    },
    enabled: !!id, // Only run query if id is provided
  });
};

const UPDATE_RECIPE_MUTATION_KEY = 'updateRecipe';

export const useUpdateRecipeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [UPDATE_RECIPE_MUTATION_KEY],
    mutationFn: async ({
      id,
      updateData,
    }: {
      id: RecipeId;
      updateData: { name: string; content: string };
    }) => {
      return recipesGateway.updateRecipe(id, updateData);
    },
    onSuccess: async (updatedRecipe) => {
      // Invalidate the recipes list
      await queryClient.invalidateQueries({
        queryKey: [GET_RECIPES_QUERY_KEY],
      });
      // Invalidate the specific recipe
      await queryClient.invalidateQueries({
        queryKey: [GET_RECIPE_BY_ID_QUERY_KEY, updatedRecipe.id],
      });
      // Invalidate recipe versions
      await queryClient.invalidateQueries({
        queryKey: [GET_RECIPE_VERSIONS_QUERY_KEY, updatedRecipe.id],
      });
      await queryClient.invalidateQueries({
        queryKey: [GET_RECIPES_DEPLOYMENT_OVERVIEW_QUERY_KEY],
      });
    },
    onError: async (error, variables, context) => {
      console.error('Error updating recipe');
      console.log('error: ', error);
      console.log('variables: ', variables);
      console.log('context: ', context);
    },
  });
};

const GET_RECIPE_VERSIONS_QUERY_KEY = 'recipeVersions';

export const useGetRecipeVersionsQuery = (id: RecipeId) => {
  return useQuery({
    queryKey: [GET_RECIPE_VERSIONS_QUERY_KEY, id],
    queryFn: () => {
      return recipesGateway.getVersionsById(id);
    },
    enabled: !!id, // Only run query if id is provided
  });
};

const DELETE_RECIPE_MUTATION_KEY = 'deleteRecipe';

export const useDeleteRecipeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [DELETE_RECIPE_MUTATION_KEY],
    mutationFn: async (recipeId: RecipeId) => {
      return recipesGateway.deleteRecipe({ recipeId });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [GET_RECIPES_QUERY_KEY],
      });
      await queryClient.invalidateQueries({
        queryKey: [GET_RECIPES_DEPLOYMENT_OVERVIEW_QUERY_KEY],
      });
    },
    onError: async (error, variables, context) => {
      console.error('Error deleting recipe');
      console.log('error: ', error);
      console.log('variables: ', variables);
      console.log('context: ', context);
    },
  });
};

const DELETE_RECIPES_BATCH_MUTATION_KEY = 'deleteRecipesBatch';

export const useDeleteRecipesBatchMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [DELETE_RECIPES_BATCH_MUTATION_KEY],
    mutationFn: async (recipeIds: RecipeId[]) => {
      return recipesGateway.deleteRecipesBatch({ recipeIds });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [GET_RECIPES_QUERY_KEY],
      });
      await queryClient.invalidateQueries({
        queryKey: [GET_RECIPES_DEPLOYMENT_OVERVIEW_QUERY_KEY],
      });
    },
    onError: async (error, variables, context) => {
      console.error('Error deleting recipes in batch');
      console.log('error: ', error);
      console.log('variables: ', variables);
      console.log('context: ', context);
    },
  });
};
