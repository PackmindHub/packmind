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
import { CommunityEditionError } from '../../domain/errors/CommunityEditionError';
import { isAccessDeniedError } from '../http/accessDeniedError';

/**
 * The change-proposal routes are not mounted in the Community Edition, so a 404
 * on them means the feature is absent.
 *
 * Unless the server answered and refused the caller: access failures answer 404
 * too (a deleted account, a space the caller is not a member of), and their
 * message is the actionable one, so those are rethrown untouched.
 */
const rethrowAsCommunityEdition = (error: unknown): never => {
  const statusCode = (error as { statusCode?: number } | null)?.statusCode;

  if (statusCode === 404 && !isAccessDeniedError(error)) {
    throw new CommunityEditionError('change proposals');
  }

  throw error;
};

export class ChangeProposalGateway implements IChangeProposalGateway {
  constructor(private readonly httpClient: PackmindHttpClient) {}

  batchCreate: Gateway<IBatchCreateChangeProposalsUseCase> = async (
    command,
  ) => {
    const { organizationId } = this.httpClient.getAuthContext();
    return this.httpClient
      .request<BatchCreateChangeProposalsResponse>(
        `/api/v0/organizations/${organizationId}/spaces/${command.spaceId}/change-proposals/batch`,
        {
          method: 'POST',
          body: { proposals: command.proposals },
        },
      )
      .catch(rethrowAsCommunityEdition);
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
    return this.httpClient
      .request<CheckChangeProposalsResponse>(
        `/api/v0/organizations/${organizationId}/spaces/${command.spaceId}/change-proposals/check`,
        {
          method: 'POST',
          body: { proposals: command.proposals },
        },
      )
      .catch(rethrowAsCommunityEdition);
  };
}
