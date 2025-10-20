import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { recipesGateway } from '../gateways';
import { RecipeId } from '@packmind/recipes/types';
import { GET_RECIPES_DEPLOYMENT_OVERVIEW_KEY } from '../../../deployments/api/queryKeys';
import {
  GET_RECIPES_KEY,
  GET_RECIPE_BY_ID_KEY,
  GET_RECIPE_VERSIONS_KEY,
  RECIPES_QUERY_SCOPE,
} from '../queryKeys';
import { ORGANIZATION_QUERY_SCOPE } from '../../../organizations/api/queryKeys';

export const useGetRecipesQuery = () => {
  return useQuery({
    queryKey: GET_RECIPES_KEY,
    queryFn: () => {
      return recipesGateway.getRecipes();
    },
  });
};

export const getRecipeByIdOptions = (id: RecipeId) => ({
  queryKey: [...GET_RECIPE_BY_ID_KEY, id],
  queryFn: () => {
    return recipesGateway.getRecipeById(id);
  },
  enabled: !!id, // Only run query if id is provided
});

export const useGetRecipeByIdQuery = (id: RecipeId) => {
  return useQuery(getRecipeByIdOptions(id));
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
      // Invalidate all queries for this specific recipe
      // This includes: recipe by id, versions (all share the id prefix)
      await queryClient.invalidateQueries({
        queryKey: [...GET_RECIPE_BY_ID_KEY, updatedRecipe.id],
      });

      // Invalidate the recipes list (name might have changed)
      await queryClient.invalidateQueries({
        queryKey: GET_RECIPES_KEY,
      });

      // Deployments overview (updated recipe version affects deployments)
      await queryClient.invalidateQueries({
        queryKey: GET_RECIPES_DEPLOYMENT_OVERVIEW_KEY,
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

export const useGetRecipeVersionsQuery = (id: RecipeId) => {
  return useQuery({
    queryKey: [...GET_RECIPE_VERSIONS_KEY, id],
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
      // Invalidate all recipes (recipe is gone, may have had cached details)
      await queryClient.invalidateQueries({
        queryKey: [ORGANIZATION_QUERY_SCOPE, RECIPES_QUERY_SCOPE],
      });

      // Deployments orphaned (same as standards)
      await queryClient.invalidateQueries({
        queryKey: GET_RECIPES_DEPLOYMENT_OVERVIEW_KEY,
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
      // Same as useDeleteRecipeMutation
      await queryClient.invalidateQueries({
        queryKey: [ORGANIZATION_QUERY_SCOPE, RECIPES_QUERY_SCOPE],
      });

      await queryClient.invalidateQueries({
        queryKey: GET_RECIPES_DEPLOYMENT_OVERVIEW_KEY,
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
