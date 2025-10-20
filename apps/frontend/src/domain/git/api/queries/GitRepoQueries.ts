import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { gitProviderGateway, repositoryGateway } from '../gateways';
import { GitProviderId, GitRepoId } from '@packmind/git';
import { AddRepositoryForm } from '../../types/GitProviderTypes';
import { CheckDirectoryExistenceResult } from '@packmind/shared';
import {
  GET_GIT_REPOSITORIES_KEY,
  GET_REPOSITORIES_BY_PROVIDER_KEY,
  GET_AVAILABLE_REPOSITORIES_KEY,
  GET_AVAILABLE_TARGETS_KEY,
  GIT_QUERY_SCOPE,
} from '../queryKeys';
import { DEPLOYMENTS_QUERY_SCOPE } from '../../../deployments/api/queryKeys';
import { ORGANIZATION_QUERY_SCOPE } from '../../../organizations/api/queryKeys';

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
  return useQuery({
    queryKey: [...GET_REPOSITORIES_BY_PROVIDER_KEY, providerId],
    queryFn: () => gitProviderGateway.getRepositoriesByProvider(providerId),
    enabled: !!providerId,
  });
};

export const useGetAvailableRepositoriesQuery = (providerId: GitProviderId) => {
  return useQuery({
    queryKey: [...GET_AVAILABLE_REPOSITORIES_KEY, providerId],
    queryFn: () => gitProviderGateway.getAvailableRepositories(providerId),
    enabled: !!providerId,
  });
};

// Repository Mutations
export const useAddRepositoryMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      providerId,
      data,
    }: {
      providerId: GitProviderId;
      data: AddRepositoryForm;
    }) => {
      return gitProviderGateway.addRepositoryToProvider(providerId, data);
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
    },
    onError: (error) => {
      console.error('Error adding repository:', error);
    },
  });
};
export const useRemoveRepositoryMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      repoId,
      providerId,
    }: {
      repoId: GitRepoId;
      providerId: GitProviderId;
    }) => {
      return gitProviderGateway.removeRepositoryFromProvider(
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
export const getAvailableTargetsOptions = (
  repositoryId: GitRepoId,
  path?: string,
  enabled = true,
) => ({
  queryKey: [...GET_AVAILABLE_TARGETS_KEY, repositoryId, path],
  queryFn: () =>
    gitProviderGateway.getAvailableRemoteDirectories(repositoryId, path),
  enabled: !!repositoryId && enabled,
  retry: false,
});

export const useGetAvailableTargetsQuery = (
  repositoryId: GitRepoId,
  path?: string,
  enabled = true,
) => {
  return useQuery(getAvailableTargetsOptions(repositoryId, path, enabled));
};

// Check Directory Existence Mutation
export const useCheckDirectoryExistenceMutation = () => {
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
      return gitProviderGateway.checkDirectoryExistence(
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
