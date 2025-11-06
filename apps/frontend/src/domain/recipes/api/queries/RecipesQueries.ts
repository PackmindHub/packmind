import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { recipesGateway } from '../gateways';
import { RecipeId } from '@packmind/types';
import { OrganizationId } from '@packmind/types';
import { SpaceId } from '@packmind/types';
import { GET_RECIPES_DEPLOYMENT_OVERVIEW_KEY } from '../../../deployments/api/queryKeys';
import {
  GET_RECIPES_KEY,
  GET_RECIPE_BY_ID_KEY,
  GET_RECIPE_VERSIONS_KEY,
  RECIPES_QUERY_SCOPE,
} from '../queryKeys';
import { ORGANIZATION_QUERY_SCOPE } from '../../../organizations/api/queryKeys';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';

export const useGetRecipesQuery = () => {
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();

  return useQuery({
    queryKey: GET_RECIPES_KEY,
    queryFn: () => {
      if (!organization?.id) {
        throw new Error('Organization ID is required to fetch recipes');
      }
      if (!spaceId) {
        throw new Error('Space ID is required to fetch recipes');
      }
      return recipesGateway.getRecipes(organization.id, spaceId);
    },
    enabled: !!organization?.id && !!spaceId,
  });
};

export const getRecipeByIdOptions = (
  organizationId: OrganizationId,
  spaceId: SpaceId,
  id: RecipeId,
) => ({
  queryKey: [...GET_RECIPE_BY_ID_KEY, id],
  queryFn: () => {
    return recipesGateway.getRecipeById(organizationId, spaceId, id);
  },
  enabled: !!organizationId && !!spaceId && !!id,
});

export const useGetRecipeByIdQuery = (id: RecipeId) => {
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();

  return useQuery(
    getRecipeByIdOptions(
      organization?.id as OrganizationId,
      spaceId as SpaceId,
      id,
    ),
  );
};

const UPDATE_RECIPE_MUTATION_KEY = 'updateRecipe';

export const useUpdateRecipeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [UPDATE_RECIPE_MUTATION_KEY],
    mutationFn: async ({
      organizationId,
      spaceId,
      id,
      updateData,
    }: {
      organizationId: OrganizationId;
      spaceId: SpaceId;
      id: RecipeId;
      updateData: { name: string; content: string };
    }) => {
      return recipesGateway.updateRecipe(
        organizationId,
        spaceId,
        id,
        updateData,
      );
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
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();

  return useQuery({
    queryKey: [...GET_RECIPE_VERSIONS_KEY, id],
    queryFn: () => {
      return recipesGateway.getVersionsById(
        organization?.id as OrganizationId,
        spaceId as SpaceId,
        id,
      );
    },
    enabled: !!organization?.id && !!spaceId && !!id,
  });
};

const DELETE_RECIPE_MUTATION_KEY = 'deleteRecipe';

export const useDeleteRecipeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [DELETE_RECIPE_MUTATION_KEY],
    mutationFn: async (command: {
      organizationId: OrganizationId;
      spaceId: SpaceId;
      recipeId: RecipeId;
    }) => {
      return recipesGateway.deleteRecipe(command);
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
    mutationFn: async (command: {
      organizationId: OrganizationId;
      spaceId: SpaceId;
      recipeIds: RecipeId[];
    }) => {
      return recipesGateway.deleteRecipesBatch(command);
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
