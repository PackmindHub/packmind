import { Gateway, IListChangeProposalsBySpace } from '@packmind/types';
import { PackmindHttpClient } from './PackmindHttpClient';

export interface IChangeProposalGateway {
  listBySpace: Gateway<IListChangeProposalsBySpace>;
}

export class ChangeProposalGateway implements IChangeProposalGateway {
  constructor(private readonly httpClient: PackmindHttpClient) {}

  listBySpace: Gateway<IListChangeProposalsBySpace> = async (command) => {
    const organizationId = this.httpClient.getOrganizationId();
    return this.httpClient.request(
      `/api/v0/organizations/${organizationId}/spaces/${command.spaceId}/change-proposals/grouped`,
    );
  };
}
