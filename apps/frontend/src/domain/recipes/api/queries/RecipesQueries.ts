import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router';

import { recipesGateway } from '../gateways';
import { OrganizationId, RecipeId, SpaceId } from '@packmind/types';
import {
  GET_RECIPES_DEPLOYMENT_OVERVIEW_KEY,
  LIST_PACKAGES_BY_SPACE_KEY,
} from '../../../deployments/api/queryKeys';
import {
  GET_RECIPES_KEY,
  GET_RECIPE_BY_ID_KEY,
  GET_RECIPE_VERSIONS_KEY,
  RECIPES_QUERY_SCOPE,
} from '../queryKeys';
import { ORGANIZATION_QUERY_SCOPE } from '../../../organizations/api/queryKeys';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';

export const getRecipesBySpaceQueryOptions = (
  organizationId: OrganizationId | undefined,
  spaceId: SpaceId | undefined,
) => ({
  queryKey: GET_RECIPES_KEY,
  queryFn: () => {
    if (!organizationId) {
      throw new Error('Organization ID is required to fetch recipes');
    }
    if (!spaceId) {
      throw new Error('Space ID is required to fetch recipes');
    }
    return recipesGateway.getRecipes(organizationId, spaceId);
  },
  enabled: !!organizationId && !!spaceId,
});

export const useGetRecipesQuery = () => {
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();

  return useQuery(getRecipesBySpaceQueryOptions(organization?.id, spaceId));
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
  const { spaceId, spaceSlug: currentSpaceSlug } = useCurrentSpace();
  const { orgSlug, spaceSlug } = useParams<{
    orgSlug: string;
    spaceSlug: string;
  }>();

  // Prevent query from running during org/space transitions
  // When switching orgs, the URL params may not match the current context
  const isOrgMatch = organization?.slug === orgSlug;
  const isSpaceMatch = currentSpaceSlug === spaceSlug;

  return useQuery({
    ...getRecipeByIdOptions(
      organization?.id as OrganizationId,
      spaceId as SpaceId,
      id,
    ),
    enabled:
      !!organization?.id && !!spaceId && !!id && isOrgMatch && isSpaceMatch,
  });
};

const CREATE_RECIPE_MUTATION_KEY = 'createRecipe';

export const useCreateRecipeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [CREATE_RECIPE_MUTATION_KEY],
    mutationFn: async ({
      organizationId,
      spaceId,
      recipe,
    }: {
      organizationId: OrganizationId;
      spaceId: SpaceId;
      recipe: { name: string; content: string; slug?: string };
    }) => {
      return recipesGateway.createRecipe(organizationId, spaceId, recipe);
    },
    onSuccess: async () => {
      // Invalidate the recipes list to show the new recipe
      await queryClient.invalidateQueries({
        queryKey: GET_RECIPES_KEY,
      });

      // Deployments overview may be affected
      await queryClient.invalidateQueries({
        queryKey: GET_RECIPES_DEPLOYMENT_OVERVIEW_KEY,
      });
    },
    onError: async (error, variables, context) => {
      console.error('Error creating recipe');
      console.log('error: ', error);
      console.log('variables: ', variables);
      console.log('context: ', context);
    },
  });
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
    onSuccess: async (_, deletedCommand) => {
      // Remove the deleted recipe's query from cache to prevent 404 refetch
      queryClient.removeQueries({
        queryKey: [...GET_RECIPE_BY_ID_KEY, deletedCommand.recipeId],
      });

      // Optimistically remove the deleted recipe from the list cache
      // This prevents stale cache from causing 404 errors during navigation
      queryClient.setQueryData<
        { id: RecipeId }[] | { recipes: { id: RecipeId }[] } | undefined
      >(GET_RECIPES_KEY, (oldData) => {
        if (!oldData) return oldData;
        if (Array.isArray(oldData)) {
          return oldData.filter(
            (recipe) => recipe.id !== deletedCommand.recipeId,
          );
        }
        if ('recipes' in oldData) {
          return {
            ...oldData,
            recipes: oldData.recipes.filter(
              (recipe) => recipe.id !== deletedCommand.recipeId,
            ),
          };
        }
        return oldData;
      });

      // Invalidate all recipes to trigger background refetch
      await queryClient.invalidateQueries({
        queryKey: [ORGANIZATION_QUERY_SCOPE, RECIPES_QUERY_SCOPE],
      });

      // Deployments orphaned (same as standards)
      await queryClient.invalidateQueries({
        queryKey: GET_RECIPES_DEPLOYMENT_OVERVIEW_KEY,
      });

      // Packages containing the deleted recipe need to be refreshed
      await queryClient.invalidateQueries({
        queryKey: LIST_PACKAGES_BY_SPACE_KEY,
      });
    },
    onError: async (error, variables, context) => {
      console.error('Error deleting command');
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

      // Packages containing the deleted recipes need to be refreshed
      await queryClient.invalidateQueries({
        queryKey: LIST_PACKAGES_BY_SPACE_KEY,
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
