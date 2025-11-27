import {
  OrganizationId,
  LLMServiceConfig,
  TestLLMConnectionResponse,
  SaveLLMConfigurationResponse,
  GetLLMConfigurationResponse,
  TestSavedLLMConfigurationResponse,
  GetAvailableProvidersResponse,
} from '@packmind/types';

export interface ILLMGateway {
  testConnection(
    organizationId: OrganizationId,
    config: LLMServiceConfig,
  ): Promise<TestLLMConnectionResponse>;

  saveConfiguration(
    organizationId: OrganizationId,
    config: LLMServiceConfig,
  ): Promise<SaveLLMConfigurationResponse>;

  getConfiguration(
    organizationId: OrganizationId,
  ): Promise<GetLLMConfigurationResponse>;

  testSavedConfiguration(
    organizationId: OrganizationId,
  ): Promise<TestSavedLLMConfigurationResponse>;

  getAvailableProviders(
    organizationId: OrganizationId,
  ): Promise<GetAvailableProvidersResponse>;
}
