import {
  CreateChangeProposalGatewayCommand,
  IChangeProposalGateway,
} from '../../domain/repositories/IChangeProposalGateway';
import { PackmindHttpClient } from '../http/PackmindHttpClient';

export class ChangeProposalGateway implements IChangeProposalGateway {
  constructor(private readonly httpClient: PackmindHttpClient) {}

  async createChangeProposal(
    command: CreateChangeProposalGatewayCommand,
  ): Promise<void> {
    const { organizationId } = this.httpClient.getAuthContext();
    await this.httpClient.request(
      `/api/v0/organizations/${organizationId}/spaces/${command.spaceId}/change-proposals`,
      {
        method: 'POST',
        body: {
          type: command.type,
          artefactId: command.artefactId,
          payload: command.payload,
          captureMode: command.captureMode,
        },
      },
    );
  }
}
