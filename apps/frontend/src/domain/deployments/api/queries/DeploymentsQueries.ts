import {
  AddTargetCommand,
  CreatePackageCommand,
  DeleteTargetCommand,
  DeleteTargetResponse,
  OrganizationId,
  PackageId,
  RecipeId,
  RecipeVersionId,
  SpaceId,
  StandardId,
  StandardVersionId,
  TargetId,
  UpdatePackageCommand,
  UpdateRenderModeConfigurationCommand,
  UpdateTargetCommand,
} from '@packmind/types';
import { pmToaster } from '@packmind/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router';
import { isPackmindError } from '../../../../services/api/errors/PackmindError';
import { GET_ONBOARDING_STATUS_KEY } from '../../../accounts/api/queryKeys';
import { useAuthContext } from '../../../accounts/hooks';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import { deploymentsGateways } from '../gateways';
import {
  DeploymentQueryKeys,
  GET_PACKAGE_BY_ID_KEY,
  GET_RECIPES_DEPLOYMENT_OVERVIEW_KEY,
  GET_RENDER_MODE_CONFIGURATION_KEY,
  GET_STANDARDS_DEPLOYMENT_OVERVIEW_KEY,
  GET_TARGETS_BY_ORGANIZATION_KEY,
  GET_TARGETS_BY_REPOSITORY_KEY,
  LIST_PACKAGES_BY_SPACE_KEY,
  LIST_PACKAGE_DEPLOYMENTS_KEY,
  LIST_RECIPE_DEPLOYMENTS_KEY,
  LIST_STANDARD_DEPLOYMENTS_KEY,
  UPDATE_PACKAGE_MUTATION_KEY,
} from '../queryKeys';

export const useListRecipeDeploymentsQuery = (recipeId: RecipeId) => {
  const { organization } = useAuthContext();

  return useQuery({
    queryKey: [...LIST_RECIPE_DEPLOYMENTS_KEY, recipeId],
    queryFn: () => {
      if (!organization?.id) {
        throw new Error(
          'Organization ID is required to fetch recipe deployments',
        );
      }
      return deploymentsGateways.listDeploymentsByRecipeId({
        organizationId: organization.id,
        recipeId,
      });
    },
    enabled: !!organization?.id,
  });
};

export const useListStandardDeploymentsQuery = (standardId: StandardId) => {
  const { organization } = useAuthContext();

  return useQuery({
    queryKey: [...LIST_STANDARD_DEPLOYMENTS_KEY, standardId],
    queryFn: () => {
      if (!organization?.id) {
        throw new Error(
          'Organization ID is required to fetch standard deployments',
        );
      }
      return deploymentsGateways.listDeploymentsByStandardId({
        organizationId: organization.id,
        standardId,
      });
    },
    enabled: !!organization?.id,
  });
};

export const useListPackageDeploymentsQuery = (packageId: PackageId) => {
  const { organization } = useAuthContext();

  return useQuery({
    queryKey: [...LIST_PACKAGE_DEPLOYMENTS_KEY, packageId],
    queryFn: () => {
      if (!organization?.id) {
        throw new Error(
          'Organization ID is required to fetch package deployments',
        );
      }
      return deploymentsGateways.listDeploymentsByPackageId({
        organizationId: organization.id,
        packageId,
      });
    },
    enabled: !!organization?.id,
  });
};

export const getPackagesBySpaceQueryOptions = (
  spaceId: SpaceId | undefined,
  organizationId: OrganizationId | undefined,
) => ({
  queryKey: [...LIST_PACKAGES_BY_SPACE_KEY, spaceId, organizationId],
  queryFn: () => {
    if (!spaceId) {
      throw new Error('Space ID is required to fetch packages');
    }
    if (!organizationId) {
      throw new Error('Organization ID is required to fetch packages');
    }
    return deploymentsGateways.listPackagesBySpace({
      spaceId,
      organizationId,
    });
  },
  enabled: !!spaceId && !!organizationId,
});

export const useListPackagesBySpaceQuery = (
  spaceId: SpaceId | undefined,
  organizationId: OrganizationId | undefined,
) => {
  return useQuery(getPackagesBySpaceQueryOptions(spaceId, organizationId));
};

export const getPackageByIdOptions = (
  organizationId: OrganizationId,
  spaceId: SpaceId,
  packageId: PackageId,
) => ({
  queryKey: [...GET_PACKAGE_BY_ID_KEY, packageId, spaceId, organizationId],
  queryFn: () => {
    return deploymentsGateways.getPackageById({
      packageId,
      spaceId,
      organizationId,
    });
  },
});

export const useGetPackageByIdQuery = (
  packageId: PackageId | undefined,
  spaceId: SpaceId | undefined,
  organizationId: OrganizationId | undefined,
) => {
  const { spaceSlug: currentSpaceSlug } = useCurrentSpace();
  const { organization } = useAuthContext();
  const { orgSlug, spaceSlug } = useParams<{
    orgSlug: string;
    spaceSlug: string;
  }>();

  // Prevent query from running during org/space transitions
  // When switching orgs, the URL params may not match the current context
  const isOrgMatch = organization?.slug === orgSlug;
  const isSpaceMatch = currentSpaceSlug === spaceSlug;

  return useQuery({
    queryKey: [...GET_PACKAGE_BY_ID_KEY, packageId, spaceId, organizationId],
    queryFn: () => {
      return deploymentsGateways.getPackageById({
        packageId: packageId!,
        spaceId: spaceId!,
        organizationId: organizationId!,
      });
    },
    enabled:
      !!packageId &&
      !!spaceId &&
      !!organizationId &&
      isOrgMatch &&
      isSpaceMatch,
  });
};

export const useGetRecipesDeploymentOverviewQuery = () => {
  const { organization } = useAuthContext();

  return useQuery({
    queryKey: GET_RECIPES_DEPLOYMENT_OVERVIEW_KEY,
    queryFn: () => {
      if (!organization?.id) {
        throw new Error(
          'Organization ID is required to fetch recipes deployment overview',
        );
      }
      return deploymentsGateways.getRecipesDeploymentOverview({
        organizationId: organization.id,
      });
    },
    enabled: !!organization?.id,
  });
};

export const useGetStandardsDeploymentOverviewQuery = () => {
  const { organization } = useAuthContext();

  return useQuery({
    queryKey: GET_STANDARDS_DEPLOYMENT_OVERVIEW_KEY,
    queryFn: () => {
      if (!organization?.id) {
        throw new Error(
          'Organization ID is required to fetch standards deployment overview',
        );
      }
      return deploymentsGateways.getStandardsDeploymentOverview({
        organizationId: organization.id,
      });
    },
    enabled: !!organization?.id,
  });
};

export const DEPLOY_RECIPES_MUTATION_KEY = 'deployRecipes';
export const useDeployRecipesMutation = () => {
  const queryClient = useQueryClient();
  const { organization } = useAuthContext();

  return useMutation({
    mutationKey: [DEPLOY_RECIPES_MUTATION_KEY],
    mutationFn: async ({
      recipeVersionIds,
      targetIds,
    }: {
      recipeVersionIds: RecipeVersionId[];
      targetIds: TargetId[];
    }) => {
      if (!organization?.id) {
        throw new Error('Organization ID is required to publish recipes');
      }
      console.log('Publishing recipes to targets...');
      return deploymentsGateways.publishRecipes({
        organizationId: organization.id,
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

      await queryClient.invalidateQueries({
        queryKey: [GET_ONBOARDING_STATUS_KEY],
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
  const { organization } = useAuthContext();

  return useMutation({
    mutationKey: [DEPLOY_STANDARDS_MUTATION_KEY],
    mutationFn: async ({
      standardVersionIds,
      targetIds,
    }: {
      standardVersionIds: StandardVersionId[];
      targetIds: TargetId[];
    }) => {
      if (!organization?.id) {
        throw new Error('Organization ID is required to publish standards');
      }
      console.log('Deploying standards to targets...');
      return deploymentsGateways.publishStandards({
        organizationId: organization.id,
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
      await queryClient.invalidateQueries({
        queryKey: [GET_ONBOARDING_STATUS_KEY],
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

export const DEPLOY_PACKAGES_MUTATION_KEY = 'deployPackages';
export const useDeployPackagesMutation = () => {
  const queryClient = useQueryClient();
  const { organization } = useAuthContext();

  return useMutation({
    mutationKey: [DEPLOY_PACKAGES_MUTATION_KEY],
    mutationFn: async ({
      packageIds,
      targetIds,
    }: {
      packageIds: PackageId[];
      targetIds: TargetId[];
    }) => {
      if (!organization?.id) {
        throw new Error('Organization ID is required to publish packages');
      }
      console.log('Deploying packages to targets...');
      return deploymentsGateways.publishPackages({
        organizationId: organization.id,
        packageIds,
        targetIds,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: LIST_RECIPE_DEPLOYMENTS_KEY,
      });
      await queryClient.invalidateQueries({
        queryKey: LIST_STANDARD_DEPLOYMENTS_KEY,
      });
      // Invalidate package deployments using predicate to match query key structure
      await queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey.includes(DeploymentQueryKeys.LIST_PACKAGE_DEPLOYMENTS),
      });
      await queryClient.invalidateQueries({
        queryKey: GET_RECIPES_DEPLOYMENT_OVERVIEW_KEY,
      });
      await queryClient.invalidateQueries({
        queryKey: GET_STANDARDS_DEPLOYMENT_OVERVIEW_KEY,
      });
      await queryClient.invalidateQueries({
        queryKey: [GET_ONBOARDING_STATUS_KEY],
      });
    },
    onError: async (error, variables, context) => {
      console.error('Error deploying packages to git');
      console.log('error: ', error);
      console.log('variables: ', variables);
      console.log('context: ', context);
    },
  });
};

/**
 * @deprecated Use useGetTargetsByOrganizationQuery instead.
 * This hook is maintained for backward compatibility with components
 * that still reference repository-scoped queries.
 *
 * Note: This now fetches all organization targets and returns them directly.
 * Consumers should filter by repository if needed.
 */
export const useGetTargetsByRepositoryQuery = (owner: string, repo: string) => {
  const { organization } = useAuthContext();

  return useQuery({
    queryKey: [...GET_TARGETS_BY_REPOSITORY_KEY, owner, repo],
    queryFn: () => {
      if (!organization?.id) {
        throw new Error('Organization ID is required to fetch targets');
      }
      return deploymentsGateways.getTargetsByRepository({
        organizationId: organization.id,
        owner,
        repo,
      });
    },
    enabled: !!owner && !!repo && !!organization?.id,
  });
};

export const useGetTargetsByOrganizationQuery = () => {
  const { organization } = useAuthContext();

  return useQuery({
    queryKey: GET_TARGETS_BY_ORGANIZATION_KEY,
    queryFn: () => {
      if (!organization?.id) {
        throw new Error('Organization ID is required to fetch targets');
      }
      return deploymentsGateways.getTargetsByOrganization({
        organizationId: organization.id,
      });
    },
    enabled: !!organization?.id,
  });
};

export const ADD_TARGET_MUTATION_KEY = 'addTarget';
export const useAddTargetMutation = () => {
  const queryClient = useQueryClient();
  const { organization } = useAuthContext();

  return useMutation({
    mutationKey: [ADD_TARGET_MUTATION_KEY],
    mutationFn: async (
      command: Omit<AddTargetCommand, 'userId' | 'organizationId'>,
    ) => {
      if (!organization?.id) {
        throw new Error('Organization ID is required to add target');
      }
      return deploymentsGateways.addTarget({
        ...command,
        organizationId: organization.id,
      });
    },
    onSuccess: async (newTarget) => {
      // Invalidate all target queries
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

      pmToaster.create({
        type: 'success',
        title: 'Target Added',
        description: `Target "${newTarget.name}" has been created successfully.`,
      });
    },
    onError: (error) => {
      console.error('Error adding target:', error);
      pmToaster.create({
        type: 'error',
        title: 'Failed to Add Target',
        description: isPackmindError(error)
          ? error.message
          : 'An unexpected error occurred while adding the target.',
      });
    },
  });
};

export const UPDATE_TARGET_MUTATION_KEY = 'updateTarget';
export const useUpdateTargetMutation = () => {
  const queryClient = useQueryClient();
  const { organization } = useAuthContext();

  return useMutation({
    mutationKey: [UPDATE_TARGET_MUTATION_KEY],
    mutationFn: async (
      command: Omit<UpdateTargetCommand, 'userId' | 'organizationId'>,
    ) => {
      if (!organization?.id) {
        throw new Error('Organization ID is required to update target');
      }
      return deploymentsGateways.updateTarget({
        ...command,
        organizationId: organization.id,
      });
    },
    onSuccess: async (updatedTarget) => {
      // Invalidate all target queries
      await queryClient.invalidateQueries({
        queryKey: GET_TARGETS_BY_ORGANIZATION_KEY,
      });

      await queryClient.invalidateQueries({
        queryKey: GET_RECIPES_DEPLOYMENT_OVERVIEW_KEY,
      });
      await queryClient.invalidateQueries({
        queryKey: GET_STANDARDS_DEPLOYMENT_OVERVIEW_KEY,
      });

      pmToaster.create({
        type: 'success',
        title: 'Target Updated',
        description: `Target "${updatedTarget.name}" has been updated successfully.`,
      });
    },
    onError: (error) => {
      console.error('Error updating target:', error);
      pmToaster.create({
        type: 'error',
        title: 'Failed to Update Target',
        description: isPackmindError(error)
          ? error.message
          : 'An unexpected error occurred while updating the target.',
      });
    },
  });
};

export const DELETE_TARGET_MUTATION_KEY = 'deleteTarget';
export const useDeleteTargetMutation = () => {
  const queryClient = useQueryClient();
  const { organization } = useAuthContext();

  return useMutation({
    mutationKey: [DELETE_TARGET_MUTATION_KEY],
    mutationFn: async (
      command: Omit<DeleteTargetCommand, 'userId' | 'organizationId'>,
    ): Promise<DeleteTargetResponse> => {
      if (!organization?.id) {
        throw new Error('Organization ID is required to delete target');
      }
      return deploymentsGateways.deleteTarget({
        ...command,
        organizationId: organization.id,
      });
    },
    onSuccess: async (response) => {
      // Target deleted affects all target queries and deployment overviews
      await queryClient.invalidateQueries({
        queryKey: GET_TARGETS_BY_ORGANIZATION_KEY,
      });

      await queryClient.invalidateQueries({
        queryKey: GET_RECIPES_DEPLOYMENT_OVERVIEW_KEY,
      });
      await queryClient.invalidateQueries({
        queryKey: GET_STANDARDS_DEPLOYMENT_OVERVIEW_KEY,
      });

      pmToaster.create({
        type: 'success',
        title: 'Target Deleted',
        description: 'Target has been deleted successfully.',
      });
    },
    onError: (error) => {
      console.error('Error deleting target:', error);
      pmToaster.create({
        type: 'error',
        title: 'Failed to Delete Target',
        description: isPackmindError(error)
          ? error.message
          : 'An unexpected error occurred while deleting the target.',
      });
    },
  });
};

export const useGetRenderModeConfigurationQuery = () => {
  const { organization } = useAuthContext();

  return useQuery({
    queryKey: GET_RENDER_MODE_CONFIGURATION_KEY,
    queryFn: () => {
      if (!organization?.id) {
        throw new Error(
          'Organization ID is required to fetch render mode configuration',
        );
      }
      return deploymentsGateways.getRenderModeConfiguration({
        organizationId: organization.id,
      });
    },
    enabled: !!organization?.id,
  });
};

export const UPDATE_RENDER_MODE_CONFIGURATION_MUTATION_KEY =
  'updateRenderModeConfiguration';
export const useUpdateRenderModeConfigurationMutation = () => {
  const queryClient = useQueryClient();
  const { organization } = useAuthContext();

  return useMutation({
    mutationKey: [UPDATE_RENDER_MODE_CONFIGURATION_MUTATION_KEY],
    mutationFn: async (
      command: Omit<
        UpdateRenderModeConfigurationCommand,
        'userId' | 'organizationId'
      >,
    ) => {
      if (!organization?.id) {
        throw new Error(
          'Organization ID is required to update render mode configuration',
        );
      }
      return deploymentsGateways.updateRenderModeConfiguration({
        ...command,
        organizationId: organization.id,
      });
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

export const CREATE_PACKAGE_MUTATION_KEY = 'createPackage';
export const useCreatePackageMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [CREATE_PACKAGE_MUTATION_KEY],
    mutationFn: async (command: Omit<CreatePackageCommand, 'userId'>) => {
      return deploymentsGateways.createPackage(command);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: LIST_PACKAGES_BY_SPACE_KEY,
      });
    },
    onError: (error) => {
      console.error('Error creating package:', error);
    },
  });
};

export const useUpdatePackageMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: UPDATE_PACKAGE_MUTATION_KEY,
    mutationFn: async (command: Omit<UpdatePackageCommand, 'userId'>) => {
      return deploymentsGateways.updatePackage(command);
    },
    onSuccess: async (data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: [...GET_PACKAGE_BY_ID_KEY, variables.packageId],
      });
      await queryClient.invalidateQueries({
        queryKey: LIST_PACKAGES_BY_SPACE_KEY,
      });
    },
    onError: (error) => {
      console.error('Error updating package:', error);
    },
  });
};

export const DELETE_PACKAGES_BATCH_MUTATION_KEY = 'deletePackagesBatch';
export const useDeletePackagesBatchMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [DELETE_PACKAGES_BATCH_MUTATION_KEY],
    mutationFn: async (command: {
      organizationId: OrganizationId;
      spaceId: SpaceId;
      packageIds: PackageId[];
    }) => {
      return deploymentsGateways.deletePackagesBatch(command);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: LIST_PACKAGES_BY_SPACE_KEY,
      });
    },
    onError: (error) => {
      console.error('Error deleting packages in batch:', error);
    },
  });
};
