import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { gitProviderGateway } from '../gateways';
import { OrganizationId } from '@packmind/types';
import { CreateGitProviderForm } from '../../types/GitProviderTypes';
import { GitProviderId } from '@packmind/types';
import { DEPLOYMENTS_QUERY_SCOPE } from '../../../deployments/api/queryKeys';
import {
  GET_GIT_PROVIDERS_KEY,
  GET_GIT_PROVIDER_BY_ID_KEY,
  GET_GITHUB_APP_STATUS_KEY,
  GIT_QUERY_SCOPE,
} from '../queryKeys';
import { ORGANIZATION_QUERY_SCOPE } from '../../../organizations/api/queryKeys';
import { GET_ONBOARDING_STATUS_KEY } from '../../../accounts/api/queryKeys';
import { useAuthContext } from '../../../accounts/hooks';
import { useGetMeQuery } from '../../../accounts/api/queries/UserQueries';
import { routes } from '../../../../shared/utils/routes';

// Git Provider Queries
export const useGetGitProvidersQuery = () => {
  const { organization } = useAuthContext();

  return useQuery({
    queryKey: GET_GIT_PROVIDERS_KEY,
    queryFn: () => {
      if (!organization?.id) {
        throw new Error('Organization ID is required to fetch git providers');
      }
      return gitProviderGateway.getGitProviders({
        organizationId: organization.id,
      });
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

export const useGithubAppInstallUrlMutation = () => {
  const { organization } = useAuthContext();

  return useMutation({
    mutationFn: async () => {
      if (!organization?.id) {
        throw new Error(
          'Organization ID is required to fetch GitHub App install URL',
        );
      }
      return gitProviderGateway.getGithubAppInstallUrl(organization.id);
    },
    onError: (error) => {
      console.error('Error fetching GitHub App install URL:', error);
    },
  });
};

export const useSubmitGithubAppCallbackMutation = () => {
  const queryClient = useQueryClient();
  const { organization } = useAuthContext();

  return useMutation({
    mutationFn: async (body: { installationId: number; state: string }) => {
      if (!organization?.id) {
        throw new Error(
          'Organization ID is required to complete GitHub App install',
        );
      }
      return gitProviderGateway.submitGithubAppCallback(organization.id, body);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: GET_GIT_PROVIDERS_KEY,
      });
      if (organization?.slug) {
        const target = routes.org.toSettingsGit(organization.slug);
        window.location.assign(target);
        window.location.href = target;
      }
    },
    onError: (error) => {
      console.error('Error submitting GitHub App callback:', error);
    },
  });
};

export const useSubmitGithubAppManifestCallbackMutation = () => {
  const { organization } = useAuthContext();

  return useMutation({
    mutationFn: async (body: { code: string; state: string }) => {
      if (!organization?.id) {
        throw new Error(
          'Organization ID is required to complete GitHub App manifest callback',
        );
      }
      return gitProviderGateway.submitGithubAppManifestCallback(
        organization.id,
        body,
      );
    },
    onSuccess: ({ installUrl }) => {
      window.location.assign(installUrl);
      window.location.href = installUrl;
    },
    onError: (error) => {
      console.error('Error submitting GitHub App manifest callback:', error);
    },
  });
};

export const useGetGithubAppStatusQuery = () => {
  const { organization } = useAuthContext();
  const { data: me } = useGetMeQuery();
  const edition = me?.edition ?? 'oss';

  return useQuery({
    queryKey: [...GET_GITHUB_APP_STATUS_KEY, organization?.id],
    queryFn: () => {
      if (!organization?.id) {
        throw new Error(
          'Organization ID is required to fetch GitHub App status',
        );
      }
      return gitProviderGateway.getGithubAppStatus(organization.id);
    },
    enabled: !!organization?.id && edition === 'oss',
  });
};

export const useGetGithubAppManifestMutation = () => {
  const { organization } = useAuthContext();

  return useMutation({
    mutationFn: async () => {
      if (!organization?.id) {
        throw new Error(
          'Organization ID is required to fetch GitHub App manifest',
        );
      }
      return gitProviderGateway.getGithubAppManifest(organization.id);
    },
    onError: (error) => {
      console.error('Error fetching GitHub App manifest:', error);
    },
  });
};

export const useRevokeGithubAppMutation = () => {
  const queryClient = useQueryClient();
  const { organization } = useAuthContext();

  return useMutation({
    mutationFn: async () => {
      if (!organization?.id) {
        throw new Error('Organization ID is required to revoke GitHub App');
      }
      return gitProviderGateway.revokeGithubApp(organization.id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [...GET_GITHUB_APP_STATUS_KEY, organization?.id],
      });
      await queryClient.invalidateQueries({
        queryKey: GET_GIT_PROVIDERS_KEY,
      });
    },
    onError: (error) => {
      console.error('Error revoking GitHub App:', error);
    },
  });
};
