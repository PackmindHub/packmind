import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  SignInUserCommand,
  SignUpWithOrganizationCommand,
} from '@packmind/types';
import {
  CheckEmailAvailabilityCommand,
  createOrganizationId,
  ActivateUserAccountCommand,
  ActivateTrialAccountCommand,
  UserId,
  RequestPasswordResetCommand,
  ResetPasswordCommand,
} from '@packmind/types';
import { authGateway } from '../gateways';
import { getMeQueryOptions } from './UserQueries';
import {
  GET_ME_KEY,
  GET_MCP_URL_KEY,
  GET_CURRENT_API_KEY_KEY,
  VALIDATE_INVITATION_KEY,
  VALIDATE_PASSWORD_RESET_TOKEN_KEY,
  SELECT_ORGANIZATION_KEY,
  GET_USER_ORGANIZATIONS_KEY,
  GET_SOCIAL_PROVIDERS_KEY,
  ACCOUNTS_QUERY_SCOPE,
} from '../queryKeys';
import { ORGANIZATION_QUERY_SCOPE } from '../../../organizations/api/queryKeys';
import { useAuthContext } from '../../hooks/useAuthContext';

type SignInRequest = SignInUserCommand;

const SIGN_UP_WITH_ORGANIZATION_MUTATION_KEY = 'signUpWithOrganization';
const SIGN_IN_MUTATION_KEY = 'signIn';
const SIGN_OUT_MUTATION_KEY = 'signOut';
const SELECT_ORGANIZATION_MUTATION_KEY = 'selectOrganization';
const GET_MCP_TOKEN_MUTATION_KEY = 'getMcpToken';
const GENERATE_API_KEY_MUTATION_KEY = 'generateApiKey';
const CHECK_EMAIL_AVAILABILITY_MUTATION_KEY = 'checkEmailAvailability';
const ACTIVATE_USER_ACCOUNT_MUTATION_KEY = 'activateUserAccount';
const REQUEST_PASSWORD_RESET_MUTATION_KEY = 'requestPasswordReset';
const RESET_PASSWORD_MUTATION_KEY = 'resetPassword';
const CREATE_CLI_LOGIN_CODE_MUTATION_KEY = 'createCliLoginCode';
const ACTIVATE_TRIAL_ACCOUNT_MUTATION_KEY = 'activateTrialAccount';

export const useSignUpWithOrganizationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [SIGN_UP_WITH_ORGANIZATION_MUTATION_KEY],
    mutationFn: async (request: SignUpWithOrganizationCommand) => {
      return authGateway.signUpWithOrganization(request);
    },
    retry: false, // Disable retries for sign-up mutations
    onSuccess: (data) => {
      console.log('User and organization created successfully:', data);
      // Note: We don't prefetch /auth/me here because the user isn't signed in yet
      // The sign-in mutation that follows will handle the prefetch

      // Invalidate to ensure fresh data after the subsequent sign-in
      queryClient.invalidateQueries({ queryKey: GET_ME_KEY });
      queryClient.invalidateQueries({
        queryKey: GET_USER_ORGANIZATIONS_KEY,
      });
    },
    onError: (error) => {
      console.error('Error signing up user with organization:', error);
    },
  });
};

export const useSignInMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [SIGN_IN_MUTATION_KEY],
    mutationFn: async (request: SignInRequest) => {
      return authGateway.signIn(request);
    },
    retry: false, // Disable retries for sign-in mutations
    onSuccess: async () => {
      // Prefetch /auth/me immediately after sign-in to avoid loader delays
      // This ensures the data is in cache before navigation to protected routes
      await queryClient.prefetchQuery({
        queryKey: GET_ME_KEY,
        queryFn: () => authGateway.getMe(),
      });
    },
    onError: (error) => {
      console.error('Error signing in user:', error);
    },
  });
};

export const useSignOutMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [SIGN_OUT_MUTATION_KEY],
    mutationFn: async () => {
      return authGateway.signOut();
    },
    onSuccess: () => {
      // Clear all queries to reset authentication state
      queryClient
        .invalidateQueries({ queryKey: GET_ME_KEY })
        .then(() => queryClient.clear());
    },
    onError: (error) => {
      console.error('Error signing out user:', error);
    },
  });
};

export const useGetMcpTokenMutation = () => {
  const { organization } = useAuthContext();

  return useMutation({
    mutationKey: [GET_MCP_TOKEN_MUTATION_KEY],
    mutationFn: async () => {
      if (!organization?.id) {
        throw new Error('Organization ID is required to get MCP token');
      }
      return authGateway.getMcpToken({ organizationId: organization.id });
    },
    onSuccess: (data) => {
      console.log('MCP access token retrieved successfully:', data);
    },
    onError: (error) => {
      console.error('Error retrieving MCP access token:', error);
    },
  });
};

export const useGetMcpURLQuery = () => {
  const { organization } = useAuthContext();

  return useQuery({
    queryKey: GET_MCP_URL_KEY,
    queryFn: () => {
      if (!organization?.id) {
        throw new Error('Organization ID is required to get MCP URL');
      }
      return authGateway.getMcpURL({ organizationId: organization.id });
    },
    enabled: !!organization?.id,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
};

export const useGetCurrentApiKeyQuery = ({ userId }: { userId: UserId }) => {
  return useQuery({
    queryKey: GET_CURRENT_API_KEY_KEY,
    queryFn: () =>
      authGateway.getCurrentApiKey({
        userId,
      }),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
};

export const useGenerateApiKeyMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [GENERATE_API_KEY_MUTATION_KEY],
    mutationFn: async () => {
      return authGateway.generateApiKey({});
    },
    onSuccess: (data) => {
      console.log('API key generated successfully:', data);
      // Invalidate current API key query to refresh the UI
      queryClient.invalidateQueries({
        queryKey: GET_CURRENT_API_KEY_KEY,
      });
    },
    onError: (error) => {
      console.error('Error generating API key:', error);
    },
  });
};

export const useCreateCliLoginCodeMutation = () => {
  return useMutation({
    mutationKey: [CREATE_CLI_LOGIN_CODE_MUTATION_KEY],
    mutationFn: async () => {
      return authGateway.createCliLoginCode();
    },
    onError: (error) => {
      console.error('Error creating CLI login code:', error);
    },
  });
};

export const useCheckEmailAvailabilityMutation = () => {
  return useMutation({
    mutationKey: [CHECK_EMAIL_AVAILABILITY_MUTATION_KEY],
    mutationFn: async (request: CheckEmailAvailabilityCommand) => {
      return authGateway.checkEmailAvailability(request);
    },
    onError: (error) => {
      console.error('Error checking email availability:', error);
    },
  });
};

export const useValidateInvitationQuery = (token: string) => {
  return useQuery({
    queryKey: [...VALIDATE_INVITATION_KEY, token],
    queryFn: () => authGateway.validateInvitationToken(token),
    enabled: !!token,
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
};

export const useActivateUserAccountMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [ACTIVATE_USER_ACCOUNT_MUTATION_KEY],
    mutationFn: async (request: ActivateUserAccountCommand) => {
      return authGateway.activateUserAccount(request);
    },
    onSuccess: (data) => {
      console.log('User account activated successfully:', data);
      // Simplify: Invalidate all auth queries
      queryClient.invalidateQueries({
        queryKey: [ORGANIZATION_QUERY_SCOPE, ACCOUNTS_QUERY_SCOPE],
      });
    },
    onError: (error) => {
      console.error('Error activating user account:', error);
    },
  });
};

export const useRequestPasswordResetMutation = () => {
  return useMutation({
    mutationKey: [REQUEST_PASSWORD_RESET_MUTATION_KEY],
    mutationFn: async (request: RequestPasswordResetCommand) => {
      return authGateway.requestPasswordReset(request);
    },
    onSuccess: (data) => {
      console.log('Password reset requested successfully:', data);
    },
    onError: (error) => {
      console.error('Error requesting password reset:', error);
    },
  });
};

export const useValidatePasswordResetTokenQuery = (token: string) => {
  return useQuery({
    queryKey: [...VALIDATE_PASSWORD_RESET_TOKEN_KEY, token],
    queryFn: () => authGateway.validatePasswordResetToken(token),
    enabled: !!token,
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
};

export const useResetPasswordMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [RESET_PASSWORD_MUTATION_KEY],
    mutationFn: async (request: ResetPasswordCommand) => {
      return authGateway.resetPassword(request);
    },
    onSuccess: (data) => {
      console.log('Password reset successfully:', data);
      // Simplify: Invalidate all auth queries
      queryClient.invalidateQueries({
        queryKey: [ORGANIZATION_QUERY_SCOPE, ACCOUNTS_QUERY_SCOPE],
      });
    },
    onError: (error) => {
      console.error('Error resetting password:', error);
    },
  });
};

export const useActivateTrialAccountMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [ACTIVATE_TRIAL_ACCOUNT_MUTATION_KEY],
    mutationFn: async (request: ActivateTrialAccountCommand) => {
      return authGateway.activateTrialAccount(request);
    },
    onSuccess: () => {
      // Invalidate auth queries to refresh user state after activation
      queryClient.invalidateQueries({ queryKey: GET_ME_KEY });
      queryClient.invalidateQueries({ queryKey: GET_USER_ORGANIZATIONS_KEY });
    },
    onError: (error) => {
      console.error('Error activating trial account:', error);
    },
  });
};

export const getSelectOrganizationQueryOptions = (organizationId: string) => ({
  queryKey: [...SELECT_ORGANIZATION_KEY, organizationId],
  queryFn: () =>
    authGateway.selectOrganization({
      organizationId: createOrganizationId(organizationId),
    }),
});

export const useSocialProvidersQuery = () => {
  return useQuery({
    queryKey: [...GET_SOCIAL_PROVIDERS_KEY],
    queryFn: () => authGateway.getSocialProviders(),
    staleTime: 30 * 60 * 1000, // 30 minutes
    retry: false,
  });
};

export const useSelectOrganizationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [SELECT_ORGANIZATION_MUTATION_KEY],
    mutationFn: async (request: { organizationId: string }) => {
      return authGateway.selectOrganization({
        organizationId: createOrganizationId(request.organizationId),
      });
    },
    onSuccess: async () => {
      // After the new JWT is set, cancel all in-flight organization-scoped queries
      // to prevent 403/500 errors from requests using the old organization context
      await queryClient.cancelQueries({
        queryKey: [ORGANIZATION_QUERY_SCOPE],
      });

      // Remove all organization-scoped queries from the cache to prevent
      // refetching with stale organization context during navigation
      // (GET_ME_KEY is included since it starts with ORGANIZATION_QUERY_SCOPE)
      queryClient.removeQueries({
        queryKey: [ORGANIZATION_QUERY_SCOPE],
      });

      // Fetch fresh /auth/me data and WAIT for it to complete
      // This ensures the cache has the new org context before navigation
      await queryClient.fetchQuery(getMeQueryOptions());
    },
    onError: (error) => {
      console.error('Error selecting organization:', error);
    },
  });
};
