import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { gitProviderGateway, repositoryGateway } from '../gateways';
import { GitProviderId, GitRepoId, OrganizationId } from '@packmind/types';
import { AddRepositoryForm } from '../../types/GitProviderTypes';
import { CheckDirectoryExistenceResult } from '@packmind/types';
import {
  GET_GIT_REPOSITORIES_KEY,
  GET_REPOSITORIES_BY_PROVIDER_KEY,
  GET_AVAILABLE_REPOSITORIES_KEY,
  GET_AVAILABLE_TARGETS_KEY,
  GIT_QUERY_SCOPE,
} from '../queryKeys';
import { DEPLOYMENTS_QUERY_SCOPE } from '../../../deployments/api/queryKeys';
import { ORGANIZATION_QUERY_SCOPE } from '../../../organizations/api/queryKeys';
import { GET_ONBOARDING_STATUS_KEY } from '../../../accounts/api/queryKeys';
import { useAuthContext } from '../../../accounts/hooks';

export const useGetGitReposQuery = () => {
  return useQuery({
    queryKey: GET_GIT_REPOSITORIES_KEY,
    queryFn: () => {
      return repositoryGateway.getRepositories();
    },
  });
};

export const useGetRepositoriesByProviderQuery = (
  providerId: GitProviderId,
) => {
  const { organization } = useAuthContext();

  return useQuery({
    queryKey: [
      ...GET_REPOSITORIES_BY_PROVIDER_KEY,
      organization?.id,
      providerId,
    ],
    queryFn: () => {
      if (!organization?.id) {
        throw new Error('Organization ID is required to fetch repositories');
      }
      return gitProviderGateway.getRepositoriesByProvider(
        organization.id,
        providerId,
      );
    },
    enabled: !!organization?.id && !!providerId,
  });
};

export const useGetAvailableRepositoriesQuery = (providerId: GitProviderId) => {
  const { organization } = useAuthContext();

  return useQuery({
    queryKey: [...GET_AVAILABLE_REPOSITORIES_KEY, organization?.id, providerId],
    queryFn: () => {
      if (!organization?.id) {
        throw new Error(
          'Organization ID is required to fetch available repositories',
        );
      }
      return gitProviderGateway.getAvailableRepositories(
        organization.id,
        providerId,
      );
    },
    enabled: !!organization?.id && !!providerId,
  });
};

// Repository Mutations
export const useAddRepositoryMutation = () => {
  const queryClient = useQueryClient();
  const { organization } = useAuthContext();

  return useMutation({
    mutationFn: async ({
      providerId,
      data,
    }: {
      providerId: GitProviderId;
      data: AddRepositoryForm;
    }) => {
      if (!organization?.id) {
        throw new Error('Organization ID is required to add repository');
      }
      return gitProviderGateway.addRepositoryToProvider(
        organization.id,
        providerId,
        data,
      );
    },
    onSuccess: async () => {
      // Simplify: All git data is interconnected
      await queryClient.invalidateQueries({
        queryKey: [ORGANIZATION_QUERY_SCOPE, GIT_QUERY_SCOPE],
      });

      // Deployment overviews (new repo can have targets)
      await queryClient.invalidateQueries({
        queryKey: [ORGANIZATION_QUERY_SCOPE, DEPLOYMENTS_QUERY_SCOPE],
      });
      await queryClient.invalidateQueries({
        queryKey: [GET_ONBOARDING_STATUS_KEY],
      });
    },
    onError: (error) => {
      console.error('Error adding repository:', error);
    },
  });
};
export const useRemoveRepositoryMutation = () => {
  const queryClient = useQueryClient();
  const { organization } = useAuthContext();

  return useMutation({
    mutationFn: async ({
      providerId,
      repoId,
    }: {
      providerId: GitProviderId;
      repoId: GitRepoId;
    }) => {
      if (!organization?.id) {
        throw new Error('Organization ID is required to remove repository');
      }
      return gitProviderGateway.removeRepositoryFromProvider(
        organization.id,
        providerId,
        repoId,
      );
    },
    onSuccess: async () => {
      // Simplify: All git data is interconnected
      await queryClient.invalidateQueries({
        queryKey: [ORGANIZATION_QUERY_SCOPE, GIT_QUERY_SCOPE],
      });

      // Deployment overviews (removing repo deletes targets)
      await queryClient.invalidateQueries({
        queryKey: [ORGANIZATION_QUERY_SCOPE, DEPLOYMENTS_QUERY_SCOPE],
      });
    },
    onError: (error) => {
      console.error('Error removing repository:', error);
    },
  });
};

// Available Targets Query
export const useGetAvailableTargetsQuery = (
  repositoryId: GitRepoId,
  path?: string,
  enabled = true,
) => {
  const { organization } = useAuthContext();

  return useQuery({
    queryKey: [
      ...GET_AVAILABLE_TARGETS_KEY,
      organization?.id,
      repositoryId,
      path,
    ],
    queryFn: () => {
      if (!organization?.id) {
        throw new Error(
          'Organization ID is required to fetch available targets',
        );
      }
      return gitProviderGateway.getAvailableRemoteDirectories(
        organization.id,
        repositoryId,
        path,
      );
    },
    enabled: !!organization?.id && !!repositoryId && enabled,
    retry: false,
  });
};

// Check Directory Existence Mutation
export const useCheckDirectoryExistenceMutation = () => {
  const { organization } = useAuthContext();

  return useMutation({
    mutationFn: async ({
      repositoryId,
      directoryPath,
      branch,
    }: {
      repositoryId: GitRepoId;
      directoryPath: string;
      branch: string;
    }): Promise<CheckDirectoryExistenceResult> => {
      if (!organization?.id) {
        throw new Error(
          'Organization ID is required to check directory existence',
        );
      }
      return gitProviderGateway.checkDirectoryExistence(
        organization.id,
        repositoryId,
        directoryPath,
        branch,
      );
    },
    onError: (error) => {
      console.error('Error checking directory existence:', error);
    },
  });
};
