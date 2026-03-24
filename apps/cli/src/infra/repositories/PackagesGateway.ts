import { IPackagesGateway } from '../../domain/repositories/IPackagesGateway';
import { PackmindHttpClient } from '../http/PackmindHttpClient';
import {
  IGetPackageSummaryUseCase,
  IListPackagesBySpaceUseCase,
  Gateway,
  ICreatePackageUseCase,
  IAddArtefactsToPackageUseCase,
} from '@packmind/types';

export class PackagesGateway implements IPackagesGateway {
  constructor(
    private readonly apiKey: string,
    private readonly httpClient: PackmindHttpClient,
  ) {}

  public list: Gateway<IListPackagesBySpaceUseCase> = async (command) => {
    const { organizationId } = this.httpClient.getAuthContext();

    return this.httpClient.request(
      `/api/v0/organizations/${organizationId}/spaces/${command.spaceId}/packages`,
    );
  };

  public getSummary: Gateway<IGetPackageSummaryUseCase> = async ({
    slug,
    spaceId,
  }) => {
    const { organizationId } = this.httpClient.getAuthContext();

    return this.httpClient.request(
      `/api/v0/organizations/${organizationId}/spaces/${spaceId}/packages/summary/${encodeURIComponent(slug)}`,
    );
  };

  public create: Gateway<ICreatePackageUseCase> = async (command) => {
    const { organizationId } = this.httpClient.getAuthContext();
    return this.httpClient.request(
      `/api/v0/organizations/${organizationId}/spaces/${command.spaceId}/packages`,
      {
        method: 'POST',
        body: command,
      },
    );
  };

  public addArtefacts: Gateway<IAddArtefactsToPackageUseCase> = async (
    command,
  ) => {
    const { organizationId } = this.httpClient.getAuthContext();
    const { packageId, spaceId } = command;

    return this.httpClient.request(
      `/api/v0/organizations/${organizationId}/spaces/${spaceId}/packages/${packageId}/add-artifacts`,
      {
        method: 'POST',
        body: command,
      },
    );
  };
}
