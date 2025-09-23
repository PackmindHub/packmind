import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { gitProviderGateway } from '../gateways';
import { OrganizationId } from '@packmind/accounts/types';
import { CreateGitProviderForm } from '../../types/GitProviderTypes';
import { GitProviderId } from '@packmind/git/types';
import {
  GET_RECIPES_DEPLOYMENT_OVERVIEW_QUERY_KEY,
  GET_STANDARDS_DEPLOYMENT_OVERVIEW_QUERY_KEY,
} from '../../../deployments/api/queries/DeploymentsQueries';

// Query Keys
export const GET_GIT_PROVIDERS_QUERY_KEY = 'gitProviders';

// Git Provider Queries
export const useGetGitProvidersQuery = (organizationId: OrganizationId) => {
  return useQuery({
    queryKey: [GET_GIT_PROVIDERS_QUERY_KEY, organizationId],
    queryFn: () => gitProviderGateway.getGitProviders(organizationId),
    enabled: !!organizationId,
  });
};

export const GET_GIT_PROVIDER_QUERY_KEY = 'gitProvider';

export const useGetGitProviderByIdQuery = (id: GitProviderId) => {
  return useQuery({
    queryKey: [GET_GIT_PROVIDER_QUERY_KEY, id],
    queryFn: () => gitProviderGateway.getGitProviderById(id),
    enabled: !!id,
  });
};

// Git Provider Mutations
export const useCreateGitProviderMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      data,
    }: {
      organizationId: OrganizationId;
      data: CreateGitProviderForm;
    }) => {
      return gitProviderGateway.createGitProvider(organizationId, data);
    },
    onSuccess: async (_, { organizationId }) => {
      await queryClient.invalidateQueries({
        queryKey: [GET_GIT_PROVIDERS_QUERY_KEY, organizationId],
      });
    },
    onError: (error) => {
      console.error('Error creating git provider:', error);
    },
  });
};

export const useUpdateGitProviderMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: GitProviderId;
      data: Partial<CreateGitProviderForm>;
    }) => {
      return gitProviderGateway.updateGitProvider(id, data);
    },
    onSuccess: async (provider) => {
      await queryClient.invalidateQueries({
        queryKey: [GET_GIT_PROVIDERS_QUERY_KEY, provider.organizationId],
      });
      await queryClient.invalidateQueries({
        queryKey: [GET_GIT_PROVIDER_QUERY_KEY, provider.id],
      });
    },
    onError: (error) => {
      console.error('Error updating git provider:', error);
    },
  });
};

export const useDeleteGitProviderMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      organizationId,
    }: {
      id: GitProviderId;
      organizationId: OrganizationId;
    }) => {
      return gitProviderGateway.deleteGitProvider(id);
    },
    onSuccess: async (_, { organizationId }) => {
      await queryClient.invalidateQueries({
        queryKey: [GET_GIT_PROVIDERS_QUERY_KEY, organizationId],
      });
      await queryClient.invalidateQueries({
        queryKey: [GET_STANDARDS_DEPLOYMENT_OVERVIEW_QUERY_KEY],
      });
      await queryClient.invalidateQueries({
        queryKey: [GET_RECIPES_DEPLOYMENT_OVERVIEW_QUERY_KEY],
      });
    },
    onError: (error) => {
      console.error('Error deleting git provider:', error);
    },
  });
};
