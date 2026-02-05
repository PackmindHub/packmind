import { IPackagesGateway } from '../../domain/repositories/IPackagesGateway';
import { PackmindHttpClient } from '../http/PackmindHttpClient';
import {
  IGetPackageSummaryUseCase,
  IListPackagesUseCase,
  Gateway,
  ICreatePackageUseCase,
  IAddArtefactsToPackageUseCase,
} from '@packmind/types';

export class PackagesGateway implements IPackagesGateway {
  constructor(
    private readonly apiKey: string,
    private readonly httpClient: PackmindHttpClient,
  ) {}

  public list: Gateway<IListPackagesUseCase> = async () => {
    const { organizationId } = this.httpClient.getAuthContext();

    return this.httpClient.request(
      `/api/v0/organizations/${organizationId}/packages`,
    );
  };

  public getSummary: Gateway<IGetPackageSummaryUseCase> = async ({ slug }) => {
    const { organizationId } = this.httpClient.getAuthContext();

    return this.httpClient.request(
      `/api/v0/organizations/${organizationId}/packages/${encodeURIComponent(slug)}`,
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
