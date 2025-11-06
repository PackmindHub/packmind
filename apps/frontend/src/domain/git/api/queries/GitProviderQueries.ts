import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { gitProviderGateway } from '../gateways';
import { OrganizationId } from '@packmind/types';
import { CreateGitProviderForm } from '../../types/GitProviderTypes';
import { GitProviderId } from '@packmind/git/types';
import { DEPLOYMENTS_QUERY_SCOPE } from '../../../deployments/api/queryKeys';
import {
  GET_GIT_PROVIDERS_KEY,
  GET_GIT_PROVIDER_BY_ID_KEY,
  GIT_QUERY_SCOPE,
} from '../queryKeys';
import { ORGANIZATION_QUERY_SCOPE } from '../../../organizations/api/queryKeys';
import { GET_ONBOARDING_STATUS_KEY } from '../../../accounts/api/queryKeys';

// Git Provider Queries
export const useGetGitProvidersQuery = (organizationId: OrganizationId) => {
  return useQuery({
    queryKey: [...GET_GIT_PROVIDERS_KEY, organizationId],
    queryFn: () => gitProviderGateway.getGitProviders(organizationId),
    enabled: !!organizationId,
  });
};

export const useGetGitProviderByIdQuery = (id: GitProviderId) => {
  return useQuery({
    queryKey: [...GET_GIT_PROVIDER_BY_ID_KEY, id],
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
        queryKey: [...GET_GIT_PROVIDERS_KEY, organizationId],
      });
      await queryClient.invalidateQueries({
        queryKey: [GET_ONBOARDING_STATUS_KEY],
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
        queryKey: [...GET_GIT_PROVIDERS_KEY, provider.organizationId],
      });
      await queryClient.invalidateQueries({
        queryKey: [...GET_GIT_PROVIDER_BY_ID_KEY, provider.id],
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
    onSuccess: async () => {
      // All git data (provider deleted → repos deleted)
      await queryClient.invalidateQueries({
        queryKey: [ORGANIZATION_QUERY_SCOPE, GIT_QUERY_SCOPE],
      });

      // ALL deployments (provider → repos → targets cascade deleted)
      await queryClient.invalidateQueries({
        queryKey: [ORGANIZATION_QUERY_SCOPE, DEPLOYMENTS_QUERY_SCOPE],
      });
    },
    onError: (error) => {
      console.error('Error deleting git provider:', error);
    },
  });
};
