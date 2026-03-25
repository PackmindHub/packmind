import {
  BatchCreateChangeProposalsResponse,
  CheckChangeProposalsResponse,
  Gateway,
  IBatchCreateChangeProposalsUseCase,
  ICheckChangeProposalsUseCase,
} from '@packmind/types';

import { IChangeProposalGateway } from '../../domain/repositories/IChangeProposalGateway';
import { PackmindHttpClient } from '../http/PackmindHttpClient';
import { CommunityEditionError } from '../../domain/errors/CommunityEditionError';

export class ChangeProposalGateway implements IChangeProposalGateway {
  constructor(private readonly httpClient: PackmindHttpClient) {}

  batchCreate: Gateway<IBatchCreateChangeProposalsUseCase> = async (
    command,
  ) => {
    const { organizationId } = this.httpClient.getAuthContext();
    return this.httpClient.request<BatchCreateChangeProposalsResponse>(
      `/api/v0/organizations/${organizationId}/spaces/${command.spaceId}/change-proposals/batch`,
      {
        method: 'POST',
        body: { proposals: command.proposals },
        onError: (response) => {
          if (response.status === 404) {
            throw new CommunityEditionError('change proposals');
          }
        },
      },
    );
  };

  check: Gateway<ICheckChangeProposalsUseCase> = async (command) => {
    const { organizationId } = this.httpClient.getAuthContext();
    return this.httpClient.request<CheckChangeProposalsResponse>(
      `/api/v0/organizations/${organizationId}/spaces/${command.spaceId}/change-proposals/check`,
      {
        method: 'POST',
        body: { proposals: command.proposals },
        onError: (response) => {
          if (response.status === 404) {
            throw new CommunityEditionError('change proposals');
          }
        },
      },
    );
  };
}
