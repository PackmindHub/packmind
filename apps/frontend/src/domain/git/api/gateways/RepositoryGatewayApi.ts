import { OrganizationId } from '@packmind/types';
import { PackmindGateway } from '../../../../shared/PackmindGateway';
import { IRepositoryGateway, Repository } from './IRepositoryGateway';

export class RepositoryGatewayApi
  extends PackmindGateway
  implements IRepositoryGateway
{
  constructor() {
    super('/organizations');
  }

  async getRepositories(organizationId: OrganizationId): Promise<Repository[]> {
    return this._api.get<Repository[]>(
      `${this._endpoint}/${organizationId}/git/repositories`,
    );
  }
}
