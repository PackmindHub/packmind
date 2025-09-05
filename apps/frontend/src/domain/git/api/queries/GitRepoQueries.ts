import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { gitProviderGateway, repositoryGateway } from '../gateways';
import { GitProviderId, GitRepoId } from '@packmind/git';
import { AddRepositoryForm } from '../../types/GitProviderTypes';
import { GET_GIT_PROVIDER_QUERY_KEY } from './GitProviderQueries';
import {
  GET_RECIPES_DEPLOYMENT_OVERVIEW_QUERY_KEY,
  GET_STANDARDS_DEPLOYMENT_OVERVIEW_QUERY_KEY,
} from '../../../deployments/api/queries/DeploymentsQueries';

const GET_GIT_REPOS_QUERY_KEY = 'getGitRepos';
export const useGetGitReposQuery = () => {
  return useQuery({
    queryKey: [GET_GIT_REPOS_QUERY_KEY],
    queryFn: () => {
      return repositoryGateway.getRepositories();
    },
  });
};
const GET_REPOSITORIES_BY_PROVIDER_QUERY_KEY = 'repositoriesByProvider';
export const useGetRepositoriesByProviderQuery = (
  providerId: GitProviderId,
) => {
  return useQuery({
    queryKey: [GET_REPOSITORIES_BY_PROVIDER_QUERY_KEY, providerId],
    queryFn: () => gitProviderGateway.getRepositoriesByProvider(providerId),
    enabled: !!providerId,
  });
};

const GET_AVAILABLE_REPOSITORIES_QUERY_KEY = 'availableRepositories';
export const useGetAvailableRepositoriesQuery = (providerId: GitProviderId) => {
  return useQuery({
    queryKey: [GET_AVAILABLE_REPOSITORIES_QUERY_KEY, providerId],
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
    onSuccess: async (repo) => {
      await queryClient.invalidateQueries({
        queryKey: [GET_REPOSITORIES_BY_PROVIDER_QUERY_KEY, repo.providerId],
      });
      await queryClient.invalidateQueries({
        queryKey: [GET_GIT_PROVIDER_QUERY_KEY, repo.providerId],
      });
      await queryClient.invalidateQueries({
        queryKey: [GET_STANDARDS_DEPLOYMENT_OVERVIEW_QUERY_KEY],
      });
      await queryClient.invalidateQueries({
        queryKey: [GET_RECIPES_DEPLOYMENT_OVERVIEW_QUERY_KEY],
      });
      await queryClient.invalidateQueries({
        queryKey: [GET_GIT_REPOS_QUERY_KEY],
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
    onSuccess: async (_, { providerId }) => {
      await queryClient.invalidateQueries({
        queryKey: [GET_REPOSITORIES_BY_PROVIDER_QUERY_KEY, providerId],
      });
      await queryClient.invalidateQueries({
        queryKey: [GET_GIT_PROVIDER_QUERY_KEY, providerId],
      });
      await queryClient.invalidateQueries({
        queryKey: [GET_STANDARDS_DEPLOYMENT_OVERVIEW_QUERY_KEY],
      });
      await queryClient.invalidateQueries({
        queryKey: [GET_RECIPES_DEPLOYMENT_OVERVIEW_QUERY_KEY],
      });
      await queryClient.invalidateQueries({
        queryKey: [GET_GIT_REPOS_QUERY_KEY],
      });
    },
    onError: (error) => {
      console.error('Error removing repository:', error);
    },
  });
};
