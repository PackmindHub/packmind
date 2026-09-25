import {
  Gateway,
  ICreatePackageUseCase,
  IListPackagesBySpaceUseCase,
  IUpdatePackageUseCase,
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

  /**
   * Replaces a package's membership wholesale, which is the one way left of
   * putting an artefact into a package that another package already holds:
   * creating and adding both refuse it now. A suite that has to arrange that
   * state in order to test what the CLI does with it goes through here.
   */
  update: Gateway<IUpdatePackageUseCase> = async (command) => {
    const organizationId = this.httpClient.getOrganizationId();
    return this.httpClient.request(
      `/api/v0/organizations/${organizationId}/spaces/${command.spaceId}/packages/${command.packageId}`,
      {
        method: 'PATCH',
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
}
