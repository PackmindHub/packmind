import { User } from '@packmind/accounts/types';
import { PackmindGateway } from '../../../../shared/PackmindGateway';
import { IUserGateway, UsernameExistsResponse } from './IUserGateway';

export class UserGatewayApi extends PackmindGateway implements IUserGateway {
  constructor() {
    super('/users');
  }

  async getUsersInMyOrganization(): Promise<User[]> {
    return this._api.get<User[]>(`${this._endpoint}/organization`);
  }

  async doesUsernameExist(username: string): Promise<UsernameExistsResponse> {
    return this._api.post<UsernameExistsResponse>(
      `${this._endpoint}/does-username-exist`,
      { username },
    );
  }
}
