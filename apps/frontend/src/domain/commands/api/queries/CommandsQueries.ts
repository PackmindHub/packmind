import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router';

import { commandsGateway } from '../gateways';
import { OrganizationId, CommandId, SpaceId } from '@packmind/types';
import {
  LIST_ACTIVE_DISTRIBUTED_PACKAGES_BY_SPACE_KEY,
  LIST_PACKAGES_BY_SPACE_KEY,
} from '../../../deployments/api/queryKeys';
import {
  getCommandsBySpaceKey,
  getCommandByIdKey,
  getCommandVersionsKey,
} from '../queryKeys';
import { ORGANIZATION_QUERY_SCOPE } from '../../../organizations/api/queryKeys';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import {
  CHANGE_PROPOSALS_QUERY_SCOPE,
  GET_GROUPED_CHANGE_PROPOSALS_KEY,
} from '@packmind/proprietary/frontend/domain/change-proposals/api/queryKeys';

export const getCommandsBySpaceQueryOptions = (
  organizationId: OrganizationId | undefined,
  spaceId: SpaceId | undefined,
) => ({
  queryKey: getCommandsBySpaceKey(spaceId),
  queryFn: () => {
    if (!organizationId) {
      throw new Error('Organization ID is required to fetch recipes');
    }
    if (!spaceId) {
      throw new Error('Space ID is required to fetch recipes');
    }
    return commandsGateway.getCommands(organizationId, spaceId);
  },
  enabled: !!organizationId && !!spaceId,
});

export const useGetCommandsQuery = () => {
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();

  return useQuery(getCommandsBySpaceQueryOptions(organization?.id, spaceId));
};

export const getCommandByIdOptions = (
  organizationId: OrganizationId,
  spaceId: SpaceId,
  id: CommandId,
) => ({
  queryKey: getCommandByIdKey(spaceId, id),
  queryFn: () => {
    return commandsGateway.getCommandById(organizationId, spaceId, id);
  },
  enabled: !!organizationId && !!spaceId && !!id,
});

export const useGetCommandByIdQuery = (id: CommandId) => {
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
    ...getCommandByIdOptions(
      organization?.id as OrganizationId,
      spaceId as SpaceId,
      id,
    ),
    enabled:
      !!organization?.id && !!spaceId && !!id && isOrgMatch && isSpaceMatch,
  });
};

const CREATE_RECIPE_MUTATION_KEY = 'createRecipe';

export const useCreateCommandMutation = () => {
  const queryClient = useQueryClient();
  const { spaceId } = useCurrentSpace();

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
      return commandsGateway.createCommand(organizationId, spaceId, recipe);
    },
    onSuccess: async () => {
      // Invalidate the recipes list to show the new recipe
      await queryClient.invalidateQueries({
        queryKey: getCommandsBySpaceKey(spaceId),
      });

      // Deployments overview may be affected
      await queryClient.invalidateQueries({
        queryKey: LIST_ACTIVE_DISTRIBUTED_PACKAGES_BY_SPACE_KEY,
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

export const useUpdateCommandMutation = () => {
  const queryClient = useQueryClient();
  const { spaceId } = useCurrentSpace();

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
      id: CommandId;
      updateData: { name: string; content: string };
    }) => {
      return commandsGateway.updateCommand(
        organizationId,
        spaceId,
        id,
        updateData,
      );
    },
    onSuccess: async (updatedCommand) => {
      // Invalidate all queries for this specific recipe
      await queryClient.invalidateQueries({
        queryKey: getCommandByIdKey(spaceId, updatedCommand.id),
      });

      // Invalidate the recipes list (name might have changed)
      await queryClient.invalidateQueries({
        queryKey: getCommandsBySpaceKey(spaceId),
      });

      // Deployments overview (updated recipe version affects deployments)
      await queryClient.invalidateQueries({
        queryKey: LIST_ACTIVE_DISTRIBUTED_PACKAGES_BY_SPACE_KEY,
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

export const useGetCommandVersionsQuery = (id: CommandId) => {
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();

  return useQuery({
    queryKey: getCommandVersionsKey(spaceId, id),
    queryFn: () => {
      return commandsGateway.getVersionsById(
        organization?.id as OrganizationId,
        spaceId as SpaceId,
        id,
      );
    },
    enabled: !!organization?.id && !!spaceId && !!id,
  });
};

const DELETE_RECIPE_MUTATION_KEY = 'deleteRecipe';

export const useDeleteCommandMutation = () => {
  const queryClient = useQueryClient();
  const { spaceId } = useCurrentSpace();

  return useMutation({
    mutationKey: [DELETE_RECIPE_MUTATION_KEY],
    mutationFn: async (command: {
      organizationId: OrganizationId;
      spaceId: SpaceId;
      recipeId: CommandId;
    }) => {
      return commandsGateway.deleteCommand(command);
    },
    onSuccess: async (_, deletedCommand) => {
      // Remove the deleted recipe's query from cache to prevent 404 refetch
      queryClient.removeQueries({
        queryKey: getCommandByIdKey(spaceId, deletedCommand.recipeId),
      });

      // Optimistically remove the deleted recipe from the list cache
      // This prevents stale cache from causing 404 errors during navigation
      queryClient.setQueryData<
        { id: CommandId }[] | { recipes: { id: CommandId }[] } | undefined
      >(getCommandsBySpaceKey(spaceId), (oldData) => {
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

      // Invalidate the space-scoped recipes list to trigger background refetch
      await queryClient.invalidateQueries({
        queryKey: getCommandsBySpaceKey(spaceId),
      });

      // Deployments orphaned (same as standards)
      await queryClient.invalidateQueries({
        queryKey: LIST_ACTIVE_DISTRIBUTED_PACKAGES_BY_SPACE_KEY,
      });

      // Packages containing the deleted recipe need to be refreshed
      await queryClient.invalidateQueries({
        queryKey: LIST_PACKAGES_BY_SPACE_KEY,
      });

      // Proposals on the deleted command are cancelled server-side — refresh the list
      await queryClient.invalidateQueries({
        queryKey: GET_GROUPED_CHANGE_PROPOSALS_KEY,
      });
      await queryClient.invalidateQueries({
        queryKey: [ORGANIZATION_QUERY_SCOPE, CHANGE_PROPOSALS_QUERY_SCOPE],
        refetchType: 'all',
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

export const useDeleteCommandsBatchMutation = () => {
  const queryClient = useQueryClient();
  const { spaceId } = useCurrentSpace();

  return useMutation({
    mutationKey: [DELETE_RECIPES_BATCH_MUTATION_KEY],
    mutationFn: async (command: {
      organizationId: OrganizationId;
      spaceId: SpaceId;
      recipeIds: CommandId[];
    }) => {
      return commandsGateway.deleteCommandsBatch(command);
    },
    onSuccess: async () => {
      // Same as useDeleteRecipeMutation
      await queryClient.invalidateQueries({
        queryKey: getCommandsBySpaceKey(spaceId),
      });

      await queryClient.invalidateQueries({
        queryKey: LIST_ACTIVE_DISTRIBUTED_PACKAGES_BY_SPACE_KEY,
      });

      // Packages containing the deleted recipes need to be refreshed
      await queryClient.invalidateQueries({
        queryKey: LIST_PACKAGES_BY_SPACE_KEY,
      });

      // Proposals on the deleted commands are cancelled server-side — refresh the list
      await queryClient.invalidateQueries({
        queryKey: GET_GROUPED_CHANGE_PROPOSALS_KEY,
      });
      await queryClient.invalidateQueries({
        queryKey: [ORGANIZATION_QUERY_SCOPE, CHANGE_PROPOSALS_QUERY_SCOPE],
        refetchType: 'all',
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
