import { IGitGateway, WebHooksResponse } from './IGitGateway';
import { OrganizationId } from '@packmind/types';
import { PackmindGateway } from '../../../../shared/PackmindGateway';

export class GitGatewayApi extends PackmindGateway implements IGitGateway {
  constructor() {
    super('');
  }

  async listWebHooks(
    organizationId: OrganizationId,
  ): Promise<WebHooksResponse | null> {
    return this._api.get<WebHooksResponse>(
      `${this._endpoint}/${organizationId}/hooks`,
    );
  }
}
