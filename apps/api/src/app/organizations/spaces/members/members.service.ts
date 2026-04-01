import { Injectable } from '@nestjs/common';
import { PackmindLogger } from '@packmind/logger';
import {
  IAccountsPort,
  ISpacesPort,
  OrganizationId,
  SpaceId,
  UserId,
  UserSpaceRole,
} from '@packmind/types';
import {
  InjectAccountsAdapter,
  InjectSpacesAdapter,
} from '../../../shared/HexaInjection';

@Injectable()
export class SpaceMembersService {
  constructor(
    @InjectSpacesAdapter() private readonly spacesAdapter: ISpacesPort,
    @InjectAccountsAdapter() private readonly accountsAdapter: IAccountsPort,
    private readonly logger: PackmindLogger,
  ) {}

  async listSpaceMembers(command: {
    userId: string;
    organizationId: OrganizationId;
    spaceId: SpaceId;
  }) {
    const memberships = await this.spacesAdapter.listSpaceMembers({
      userId: command.userId,
      organizationId: command.organizationId as unknown as string,
      spaceId: command.spaceId,
    });

    const orgUsers = await this.accountsAdapter.listOrganizationUsers({
      userId: command.userId,
      organizationId: command.organizationId as unknown as string,
    });

    const displayNameMap = new Map(
      orgUsers.users.map((u) => [u.userId as unknown as string, u.displayName]),
    );

    return {
      members: memberships.map((m) => ({
        userId: m.userId as unknown as string,
        spaceId: m.spaceId as unknown as string,
        displayName:
          displayNameMap.get(m.userId as unknown as string) ??
          (m.userId as unknown as string),
        role: m.role,
      })),
    };
  }

  async addMembersToSpace(command: {
    userId: string;
    organizationId: OrganizationId;
    spaceId: SpaceId;
    members: Array<{ userId: string; role: string }>;
  }) {
    const memberships = await this.spacesAdapter.addMembersToSpace({
      userId: command.userId,
      organizationId: command.organizationId as unknown as string,
      spaceId: command.spaceId,
      members: command.members.map((m) => ({
        userId: m.userId as UserId,
        role: m.role as UserSpaceRole,
      })),
    });

    return {
      memberships: memberships.map((m) => ({
        userId: m.userId as unknown as string,
        spaceId: m.spaceId as unknown as string,
        role: m.role,
      })),
    };
  }
}
