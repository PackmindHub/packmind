import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  SignInUserCommand,
  GenerateApiKeyCommand,
  SignUpWithOrganizationCommand,
} from '@packmind/accounts/types';
import {
  CheckEmailAvailabilityCommand,
  createOrganizationId,
  ActivateUserAccountCommand,
  UserId,
  RequestPasswordResetCommand,
  ResetPasswordCommand,
} from '@packmind/shared/types';
import { authGateway } from '../gateways';
import { GET_ME_QUERY_KEY } from './UserQueries';

type SignInRequest = SignInUserCommand;

const SIGN_UP_WITH_ORGANIZATION_MUTATION_KEY = 'signUpWithOrganization';
const SIGN_IN_MUTATION_KEY = 'signIn';
const SIGN_OUT_MUTATION_KEY = 'signOut';
const SELECT_ORGANIZATION_MUTATION_KEY = 'selectOrganization';
const GET_MCP_TOKEN_MUTATION_KEY = 'getMcpToken';
const GET_MCP_URL_QUERY_KEY = 'getMcpURL';
const GENERATE_API_KEY_MUTATION_KEY = 'generateApiKey';
const GET_CURRENT_API_KEY_QUERY_KEY = 'getCurrentApiKey';
const CHECK_EMAIL_AVAILABILITY_MUTATION_KEY = 'checkEmailAvailability';
const VALIDATE_INVITATION_QUERY_KEY = 'validateInvitation';
const ACTIVATE_USER_ACCOUNT_MUTATION_KEY = 'activateUserAccount';
const REQUEST_PASSWORD_RESET_MUTATION_KEY = 'requestPasswordReset';
const RESET_PASSWORD_MUTATION_KEY = 'resetPassword';
const VALIDATE_PASSWORD_RESET_TOKEN_QUERY_KEY = 'validatePasswordResetToken';

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
      // Invalidate authentication queries to refresh user state
      queryClient.invalidateQueries({ queryKey: ['getMe'] });
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
    onSuccess: (data) => {
      // Invalidate authentication queries to refresh user state
      queryClient.invalidateQueries({ queryKey: ['getMe'] });
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
    onSuccess: (data) => {
      // Clear all queries to reset authentication state
      queryClient
        .invalidateQueries({ queryKey: ['getMe'] })
        .then(() => queryClient.clear());
    },
    onError: (error) => {
      console.error('Error signing out user:', error);
    },
  });
};

export const useGetMcpTokenMutation = () => {
  return useMutation({
    mutationKey: [GET_MCP_TOKEN_MUTATION_KEY],
    mutationFn: async () => {
      return authGateway.getMcpToken();
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
  return useQuery({
    queryKey: [GET_MCP_URL_QUERY_KEY],
    queryFn: () => authGateway.getMcpURL(),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
};

export const useGetCurrentApiKeyQuery = ({ userId }: { userId: UserId }) => {
  return useQuery({
    queryKey: [GET_CURRENT_API_KEY_QUERY_KEY],
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
    mutationFn: async (request: GenerateApiKeyCommand) => {
      return authGateway.generateApiKey(request);
    },
    onSuccess: (data) => {
      console.log('API key generated successfully:', data);
      // Invalidate current API key query to refresh the UI
      queryClient.invalidateQueries({
        queryKey: [GET_CURRENT_API_KEY_QUERY_KEY],
      });
    },
    onError: (error) => {
      console.error('Error generating API key:', error);
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
    queryKey: [VALIDATE_INVITATION_QUERY_KEY, token],
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
      queryClient.invalidateQueries({ queryKey: [GET_ME_QUERY_KEY] });
      queryClient.invalidateQueries({
        queryKey: [VALIDATE_INVITATION_QUERY_KEY],
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
    queryKey: [VALIDATE_PASSWORD_RESET_TOKEN_QUERY_KEY, token],
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
      queryClient.invalidateQueries({ queryKey: [GET_ME_QUERY_KEY] });
      queryClient.invalidateQueries({
        queryKey: [VALIDATE_PASSWORD_RESET_TOKEN_QUERY_KEY],
      });
    },
    onError: (error) => {
      console.error('Error resetting password:', error);
    },
  });
};

export const getSelectOrganizationQueryOptions = (organizationId: string) => ({
  queryKey: [SELECT_ORGANIZATION_MUTATION_KEY, organizationId],
  queryFn: () =>
    authGateway.selectOrganization({
      organizationId: createOrganizationId(organizationId),
    }),
});

export const useSelectOrganizationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [SELECT_ORGANIZATION_MUTATION_KEY],
    mutationFn: async (request: { organizationId: string }) => {
      return authGateway.selectOrganization({
        organizationId: createOrganizationId(request.organizationId),
      });
    },
    onSuccess: (data) => {
      // Invalidate authentication queries to refresh user state
      queryClient.invalidateQueries({ queryKey: [GET_ME_QUERY_KEY] });
    },
    onError: (error) => {
      console.error('Error selecting organization:', error);
    },
  });
};
