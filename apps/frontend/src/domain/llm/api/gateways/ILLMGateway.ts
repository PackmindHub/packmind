import {
  OrganizationId,
  LLMServiceConfig,
  TestLLMConnectionResponse,
} from '@packmind/types';

export interface ILLMGateway {
  testConnection(
    organizationId: OrganizationId,
    config: LLMServiceConfig,
  ): Promise<TestLLMConnectionResponse>;
}
