import { IAccountsGateway } from '../IPackmindGateway';
import { Gateway, ICreateInvitationsUseCase } from '@packmind/types';
import { PackmindHttpClient } from './PackmindHttpClient';

export class AccountsGateway implements IAccountsGateway {
  constructor(private readonly httpClient: PackmindHttpClient) {}

  createInvitations: Gateway<ICreateInvitationsUseCase> = async (command) => {
    const organizationId = this.httpClient.getOrganizationId();
    return this.httpClient.request(
      `/api/v0/organizations/${organizationId}/users/invite`,
      {
        method: 'POST',
        body: command,
      },
    );
  };
}
