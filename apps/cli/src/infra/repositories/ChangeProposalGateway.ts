import {
  ApplyPlaybookResponse,
  BatchCreateChangeProposalsResponse,
  CheckChangeProposalsResponse,
  Gateway,
  IApplyPlaybookUseCase,
  IBatchCreateChangeProposalsUseCase,
  ICheckChangeProposalsUseCase,
} from '@packmind/types';

import { IChangeProposalGateway } from '../../domain/repositories/IChangeProposalGateway';
import { PackmindHttpClient } from '../http/PackmindHttpClient';
import { throwIfFeatureAbsent } from '../http/packmindEdition';

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
        onError: (response, edition) => {
          throwIfFeatureAbsent(response, edition, 'change proposals');
        },
      },
    );
  };

  batchApply: Gateway<IApplyPlaybookUseCase> = async (command) => {
    const { organizationId } = this.httpClient.getAuthContext();
    return this.httpClient.request<ApplyPlaybookResponse>(
      `/api/v0/organizations/${organizationId}/playbook/apply`,
      {
        method: 'POST',
        body: {
          proposals: command.proposals,
          message: command.message,
          ...(command.directUpdate !== undefined && {
            directUpdate: command.directUpdate,
          }),
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
        onError: (response, edition) => {
          throwIfFeatureAbsent(response, edition, 'change proposals');
        },
      },
    );
  };
}
