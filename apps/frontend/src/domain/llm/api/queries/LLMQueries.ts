import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { llmGateway } from '../gateways';
import { OrganizationId, LLMServiceConfig } from '@packmind/types';
import {
  TEST_LLM_CONNECTION_KEY,
  getLLMConfigurationKey,
  getTestSavedLLMConfigurationKey,
  getAvailableProvidersKey,
} from '../queryKeys';

const TEST_LLM_CONNECTION_MUTATION_KEY = 'testLlmConnection';
const SAVE_LLM_CONFIGURATION_MUTATION_KEY = 'saveLlmConfiguration';

export const useTestLLMConnectionMutation = (
  organizationId: OrganizationId,
) => {
  return useMutation({
    mutationKey: [TEST_LLM_CONNECTION_MUTATION_KEY, ...TEST_LLM_CONNECTION_KEY],
    mutationFn: async ({ config }: { config: LLMServiceConfig }) => {
      return llmGateway.testConnection(organizationId, config);
    },
  });
};

// Query options for getting LLM configuration
export const getGetLLMConfigurationQueryOptions = (
  organizationId: OrganizationId,
) => ({
  queryKey: getLLMConfigurationKey(organizationId),
  queryFn: () => llmGateway.getConfiguration(organizationId),
  enabled: !!organizationId,
});

export const useGetLLMConfigurationQuery = (organizationId: OrganizationId) => {
  return useQuery(getGetLLMConfigurationQueryOptions(organizationId));
};

// Query options for testing saved LLM configuration
export const getTestSavedLLMConfigurationQueryOptions = (
  organizationId: OrganizationId,
  enabled = true,
) => ({
  queryKey: getTestSavedLLMConfigurationKey(organizationId),
  queryFn: () => llmGateway.testSavedConfiguration(organizationId),
  enabled: !!organizationId && enabled,
  // Don't refetch automatically - only when explicitly triggered
  staleTime: Infinity,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
});

export const useTestSavedLLMConfigurationQuery = (
  organizationId: OrganizationId,
  enabled = true,
) => {
  return useQuery(
    getTestSavedLLMConfigurationQueryOptions(organizationId, enabled),
  );
};

export const useSaveLLMConfigurationMutation = (
  organizationId: OrganizationId,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [SAVE_LLM_CONFIGURATION_MUTATION_KEY],
    mutationFn: async ({ config }: { config: LLMServiceConfig }) => {
      return llmGateway.saveConfiguration(organizationId, config);
    },
    onSuccess: async () => {
      // Invalidate the configuration query to refetch the updated config
      await queryClient.invalidateQueries({
        queryKey: getLLMConfigurationKey(organizationId),
      });
      // Invalidate the test saved configuration query
      await queryClient.invalidateQueries({
        queryKey: getTestSavedLLMConfigurationKey(organizationId),
      });
    },
  });
};

// Query options for getting available LLM providers
export const getAvailableProvidersQueryOptions = (
  organizationId: OrganizationId,
) => ({
  queryKey: getAvailableProvidersKey(organizationId),
  queryFn: () => llmGateway.getAvailableProviders(organizationId),
  enabled: !!organizationId,
  // Providers don't change often, cache for longer
  staleTime: 5 * 60 * 1000, // 5 minutes
});

export const useGetAvailableProvidersQuery = (
  organizationId: OrganizationId,
) => {
  return useQuery(getAvailableProvidersQueryOptions(organizationId));
};
