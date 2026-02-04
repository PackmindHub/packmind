import {
  Gateway,
  IGetMcpTokenUseCase,
  IGetMcpUrlUseCase,
} from '@packmind/types';
import { IMcpGateway } from '../../domain/repositories/IMcpGateway';
import { PackmindHttpClient } from '../http/PackmindHttpClient';

export class McpGateway implements IMcpGateway {
  constructor(private readonly httpClient: PackmindHttpClient) {}

  public getToken: Gateway<IGetMcpTokenUseCase> = async () => {
    const { organizationId } = this.httpClient.getAuthContext();
    return this.httpClient.request(
      `/api/v0/organizations/${organizationId}/mcp/token`,
    );
  };

  public getUrl: Gateway<IGetMcpUrlUseCase> = async () => {
    const { organizationId } = this.httpClient.getAuthContext();
    return this.httpClient.request(
      `/api/v0/organizations/${organizationId}/mcp/url`,
    );
  };
}
