import { ILLMGateway } from './ILLMGateway';
import {
  OrganizationId,
  LLMServiceConfig,
  TestLLMConnectionResponse,
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
}
