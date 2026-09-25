import {
  Gateway,
  IAddArtefactsToPackageUseCase,
  ICreatePackageReleaseUseCase,
  ICreatePackageUseCase,
  IListPackagesBySpaceUseCase,
} from '@packmind/types';
import { IPackageGateway } from '../IPackmindGateway';
import { PackmindHttpClient } from './PackmindHttpClient';

export class PackageGateway implements IPackageGateway {
  constructor(private readonly httpClient: PackmindHttpClient) {}

  create: Gateway<ICreatePackageUseCase> = async (command) => {
    const organizationId = this.httpClient.getOrganizationId();
    return this.httpClient.request(
      `/api/v0/organizations/${organizationId}/spaces/${command.spaceId}/packages`,
      {
        method: 'POST',
        body: command,
      },
    );
  };

  list: Gateway<IListPackagesBySpaceUseCase> = async (command) => {
    const organizationId = this.httpClient.getOrganizationId();
    return this.httpClient.request(
      `/api/v0/organizations/${organizationId}/spaces/${command.spaceId}/packages`,
      {
        method: 'GET',
      },
    );
  };

  addArtefacts: Gateway<IAddArtefactsToPackageUseCase> = async (command) => {
    const organizationId = this.httpClient.getOrganizationId();
    return this.httpClient.request(
      `/api/v0/organizations/${organizationId}/spaces/${command.spaceId}/packages/${command.packageId}/add-artifacts`,
      {
        method: 'POST',
        body: command,
      },
    );
  };

  createRelease: Gateway<ICreatePackageReleaseUseCase> = async (command) => {
    const organizationId = this.httpClient.getOrganizationId();
    return this.httpClient.request(
      `/api/v0/organizations/${organizationId}/spaces/${command.spaceId}/packages/${command.packageId}/releases`,
      {
        method: 'POST',
        body: { version: command.version },
      },
    );
  };
}
