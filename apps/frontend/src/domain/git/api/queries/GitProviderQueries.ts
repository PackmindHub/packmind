import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { gitProviderGateway } from '../gateways';
import { OrganizationId } from '@packmind/types';
import { CreateGitProviderForm } from '../../types/GitProviderTypes';
import { GitProviderId } from '@packmind/types';
import { DEPLOYMENTS_QUERY_SCOPE } from '../../../deployments/api/queryKeys';
import {
  GET_GIT_PROVIDERS_KEY,
  GET_GIT_PROVIDER_BY_ID_KEY,
  GIT_QUERY_SCOPE,
} from '../queryKeys';
import { ORGANIZATION_QUERY_SCOPE } from '../../../organizations/api/queryKeys';
import { GET_ONBOARDING_STATUS_KEY } from '../../../accounts/api/queryKeys';
import { useAuthContext } from '../../../accounts/hooks';

// Git Provider Queries
export const useGetGitProvidersQuery = () => {
  const { organization } = useAuthContext();

  return useQuery({
    queryKey: GET_GIT_PROVIDERS_KEY,
    queryFn: () => {
      if (!organization?.id) {
        throw new Error('Organization ID is required to fetch git providers');
      }
      return gitProviderGateway.getGitProviders(organization.id);
    },
    enabled: !!organization?.id,
  });
};

export const useGetGitProviderByIdQuery = (id: GitProviderId) => {
  const { organization } = useAuthContext();

  return useQuery({
    queryKey: [...GET_GIT_PROVIDER_BY_ID_KEY, id],
    queryFn: () => {
      if (!organization?.id) {
        throw new Error('Organization ID is required to fetch git provider');
      }
      return gitProviderGateway.getGitProviderById(organization.id, id);
    },
    enabled: !!organization?.id && !!id,
  });
};

// Git Provider Mutations
export const useCreateGitProviderMutation = () => {
  const queryClient = useQueryClient();
  const { organization } = useAuthContext();

  return useMutation({
    mutationFn: async ({ data }: { data: CreateGitProviderForm }) => {
      if (!organization?.id) {
        throw new Error('Organization ID is required to create git provider');
      }
      return gitProviderGateway.createGitProvider(organization.id, data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: GET_GIT_PROVIDERS_KEY,
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
  const { organization } = useAuthContext();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: GitProviderId;
      data: Partial<CreateGitProviderForm>;
    }) => {
      if (!organization?.id) {
        throw new Error('Organization ID is required to update git provider');
      }
      return gitProviderGateway.updateGitProvider(organization.id, id, data);
    },
    onSuccess: async (provider) => {
      await queryClient.invalidateQueries({
        queryKey: GET_GIT_PROVIDERS_KEY,
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
  const { organization } = useAuthContext();

  return useMutation({
    mutationFn: async ({ id }: { id: GitProviderId }) => {
      if (!organization?.id) {
        throw new Error('Organization ID is required to delete git provider');
      }
      return gitProviderGateway.deleteGitProvider(organization.id, id);
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
