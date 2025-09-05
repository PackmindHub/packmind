import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SignUpUserCommand } from '@packmind/accounts/types';
import { authGateway } from '../gateways';

type SignInRequest = SignUpUserCommand;

const SIGN_UP_MUTATION_KEY = 'signUp';
const SIGN_IN_MUTATION_KEY = 'signIn';
const SIGN_OUT_MUTATION_KEY = 'signOut';
const GET_MCP_TOKEN_MUTATION_KEY = 'getMcpToken';
const GET_MCP_URL_QUERY_KEY = 'getMcpURL';
const GENERATE_API_KEY_MUTATION_KEY = 'generateApiKey';
const GET_CURRENT_API_KEY_QUERY_KEY = 'getCurrentApiKey';

export const useSignUpMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [SIGN_UP_MUTATION_KEY],
    mutationFn: async (request: SignUpUserCommand) => {
      return authGateway.signUp(request);
    },
    onSuccess: (data) => {
      console.log('User signed up successfully:', data);
      // Invalidate authentication queries to refresh user state
      queryClient.invalidateQueries({ queryKey: ['getMe'] });
    },
    onError: (error) => {
      console.error('Error signing up user:', error);
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
    onSuccess: (data) => {
      console.log('User signed in successfully:', data);
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
      console.log('User signed out successfully:', data);
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

export const useGetCurrentApiKeyQuery = () => {
  return useQuery({
    queryKey: [GET_CURRENT_API_KEY_QUERY_KEY],
    queryFn: () => authGateway.getCurrentApiKey(),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
};

export const useGenerateApiKeyMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [GENERATE_API_KEY_MUTATION_KEY],
    mutationFn: async (request: { host: string }) => {
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
