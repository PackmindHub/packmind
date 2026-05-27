import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { gitHubAppGateway } from '../gateways';
import { GitProviderId } from '@packmind/types';
import {
  GET_GITHUB_APP_STATUS_KEY,
  GET_GITHUB_APP_INSTALLATION_REPOSITORIES_KEY,
  GITHUB_APP_QUERY_SCOPE,
} from '../queryKeys';
import { ORGANIZATION_QUERY_SCOPE } from '../../../organizations/api/queryKeys';
import { GIT_QUERY_SCOPE } from '../queryKeys';

export const useGetGitHubAppStatusQuery = () => {
  return useQuery({
    queryKey: GET_GITHUB_APP_STATUS_KEY,
    queryFn: () => gitHubAppGateway.getStatus(),
  });
};

export const useGetGitHubAppInstallationRepositoriesQuery = (
  gitProviderId: GitProviderId | undefined,
) => {
  return useQuery({
    queryKey: [...GET_GITHUB_APP_INSTALLATION_REPOSITORIES_KEY, gitProviderId],
    queryFn: () => {
      if (!gitProviderId) {
        throw new Error(
          'Provider ID is required to list installation repositories',
        );
      }
      return gitHubAppGateway.listInstallationRepositories(gitProviderId);
    },
    enabled: !!gitProviderId,
  });
};

export const useRegisterGitHubAppFromManifestMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ code, state }: { code: string; state: string }) =>
      gitHubAppGateway.registerFromManifest(code, state),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [ORGANIZATION_QUERY_SCOPE, GITHUB_APP_QUERY_SCOPE],
      });
    },
    onError: (error) => {
      console.error('Error registering GitHub App from manifest:', error);
    },
  });
};

export const useLinkGitHubAppInstallationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ installationId }: { installationId: number }) =>
      gitHubAppGateway.linkInstallation(installationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [ORGANIZATION_QUERY_SCOPE, GITHUB_APP_QUERY_SCOPE],
      });
      await queryClient.invalidateQueries({
        queryKey: [ORGANIZATION_QUERY_SCOPE, GIT_QUERY_SCOPE],
      });
    },
    onError: (error) => {
      console.error('Error linking GitHub App installation:', error);
    },
  });
};

export const useUnlinkGitHubAppInstallationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => gitHubAppGateway.unlinkInstallation(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [ORGANIZATION_QUERY_SCOPE, GITHUB_APP_QUERY_SCOPE],
      });
      await queryClient.invalidateQueries({
        queryKey: [ORGANIZATION_QUERY_SCOPE, GIT_QUERY_SCOPE],
      });
    },
    onError: (error) => {
      console.error('Error unlinking GitHub App installation:', error);
    },
  });
};
