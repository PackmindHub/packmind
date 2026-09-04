import { Injectable } from '@nestjs/common';
import {
  Organization,
  UserId,
  IAccountsPort,
  RenameOrganizationCommand,
  RenameOrganizationResponse,
} from '@packmind/types';

import { InjectAccountsAdapter } from '../../shared/HexaInjection';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectAccountsAdapter() private readonly accountsAdapter: IAccountsPort,
  ) {}

  async getOrganizationByName(name: string): Promise<Organization | null> {
    return this.accountsAdapter.getOrganizationByName({ name });
  }

  async getUserOrganizations(userId: UserId): Promise<Organization[]> {
    const result = await this.accountsAdapter.listUserOrganizations({
      userId,
    });
    return result.organizations;
  }

  async createOrganization(
    userId: UserId,
    name: string,
  ): Promise<Organization> {
    return this.accountsAdapter.createOrganization({ userId, name });
  }

  async renameOrganization(
    command: RenameOrganizationCommand,
  ): Promise<RenameOrganizationResponse> {
    return this.accountsAdapter.renameOrganization(command);
  }
}
