import { ChangeProposalType } from '@packmind/types';
import { PackmindGateway } from '../../../../shared/PackmindGateway';
import {
  CreateChangeProposalParams,
  IChangeProposalsGateway,
} from './IChangeProposalsGateway';

export class ChangeProposalsGatewayApi
  extends PackmindGateway
  implements IChangeProposalsGateway
{
  constructor() {
    super('/changeProposals');
  }

  async createChangeProposal<T extends ChangeProposalType>(
    params: CreateChangeProposalParams<T>,
  ): Promise<void> {
    const { organizationId, spaceId, ...body } = params;
    await this._api.post(
      `/organizations/${organizationId}/spaces/${spaceId}/change-proposals`,
      body,
    );
  }
}
