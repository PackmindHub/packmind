import { ILLMGateway } from './ILLMGateway';
import {
  OrganizationId,
  LLMServiceConfig,
  TestLLMConnectionResponse,
  SaveLLMConfigurationResponse,
  GetLLMConfigurationResponse,
  TestSavedLLMConfigurationResponse,
  GetAvailableProvidersResponse,
} from '@packmind/types';
import { PackmindGateway } from '../../../../shared/PackmindGateway';

export class LLMGatewayApi extends PackmindGateway implements ILLMGateway {
  constructor() {
    super('/organizations');
  }

  async testConnection(
    organizationId: OrganizationId,
    config: LLMServiceConfig,
  ): Promise<TestLLMConnectionResponse> {
    return this._api.post<TestLLMConnectionResponse>(
      `${this._endpoint}/${organizationId}/llm/test-connection`,
      { config },
    );
  }

  async saveConfiguration(
    organizationId: OrganizationId,
    config: LLMServiceConfig,
  ): Promise<SaveLLMConfigurationResponse> {
    return this._api.post<SaveLLMConfigurationResponse>(
      `${this._endpoint}/${organizationId}/llm/configuration`,
      { config },
    );
  }

  async getConfiguration(
    organizationId: OrganizationId,
  ): Promise<GetLLMConfigurationResponse> {
    return this._api.get<GetLLMConfigurationResponse>(
      `${this._endpoint}/${organizationId}/llm/configuration`,
    );
  }

  async testSavedConfiguration(
    organizationId: OrganizationId,
  ): Promise<TestSavedLLMConfigurationResponse> {
    return this._api.post<TestSavedLLMConfigurationResponse>(
      `${this._endpoint}/${organizationId}/llm/configuration/test`,
      {},
    );
  }

  async getAvailableProviders(
    organizationId: OrganizationId,
  ): Promise<GetAvailableProvidersResponse> {
    return this._api.get<GetAvailableProvidersResponse>(
      `${this._endpoint}/${organizationId}/llm/providers`,
    );
  }
}
