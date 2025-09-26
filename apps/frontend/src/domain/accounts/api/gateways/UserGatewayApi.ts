import { User } from '@packmind/accounts/types';
import { PackmindGateway } from '../../../../shared/PackmindGateway';
import { IUserGateway } from './IUserGateway';

export class UserGatewayApi extends PackmindGateway implements IUserGateway {
  constructor() {
    super('/users');
  }

  async getUsersInMyOrganization(): Promise<User[]> {
    return this._api.get<User[]>(`${this._endpoint}/organization`);
  }
}
