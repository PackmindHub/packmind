import { PackmindGateway } from '../../../../shared/PackmindGateway';
import { IRepositoryGateway, Repository } from './IRepositoryGateway';

export class RepositoryGatewayApi
  extends PackmindGateway
  implements IRepositoryGateway
{
  constructor() {
    super('/git/repositories');
  }

  async getRepositories(): Promise<Repository[]> {
    return this._api.get<Repository[]>(this._endpoint);
  }
}
