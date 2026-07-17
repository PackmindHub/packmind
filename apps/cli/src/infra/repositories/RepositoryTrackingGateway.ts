import {
  Gateway,
  IGetTrackedRepositoryUseCase,
  ISetTrackedRepositoryUseCase,
  IUpdateTrackedBranchUseCase,
} from '@packmind/types';
import { IRepositoryTrackingGateway } from '../../domain/repositories/IRepositoryTrackingGateway';
import { PackmindHttpClient } from '../http/PackmindHttpClient';

export class RepositoryTrackingGateway implements IRepositoryTrackingGateway {
  constructor(private readonly httpClient: PackmindHttpClient) {}

  public getTrackedRepository: Gateway<IGetTrackedRepositoryUseCase> = async ({
    owner,
    repo,
  }) => {
    const { organizationId } = this.httpClient.getAuthContext();
    const query = new URLSearchParams({ owner, repo }).toString();
    return this.httpClient.request(
      `/api/v0/organizations/${organizationId}/git/repositories/tracked-repository?${query}`,
    );
  };

  public setTrackedRepository: Gateway<ISetTrackedRepositoryUseCase> = async (
    command,
  ) => {
    const { organizationId } = this.httpClient.getAuthContext();
    return this.httpClient.request(
      `/api/v0/organizations/${organizationId}/git/repositories/tracked-repository`,
      { method: 'POST', body: command },
    );
  };

  public updateTrackedBranch: Gateway<IUpdateTrackedBranchUseCase> = async (
    command,
  ) => {
    const { organizationId } = this.httpClient.getAuthContext();
    return this.httpClient.request(
      `/api/v0/organizations/${organizationId}/git/repositories/tracked-repository`,
      { method: 'PUT', body: command },
    );
  };
}
