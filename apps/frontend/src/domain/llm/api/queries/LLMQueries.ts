import { useMutation } from '@tanstack/react-query';
import { llmGateway } from '../gateways';
import { OrganizationId, LLMServiceConfig } from '@packmind/types';
import { TEST_LLM_CONNECTION_KEY } from '../queryKeys';

const TEST_LLM_CONNECTION_MUTATION_KEY = 'testLlmConnection';

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
