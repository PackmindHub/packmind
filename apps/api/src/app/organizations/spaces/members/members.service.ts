import { Injectable } from '@nestjs/common';
import { PackmindLogger } from '@packmind/logger';
import {
  IAccountsPort,
  ISpacesPort,
  OrganizationId,
  RemoveMemberFromSpaceResponse,
  SpaceId,
  UpdateMemberRoleResponse,
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
      organizationId: command.organizationId,
      spaceId: command.spaceId,
    });

    const orgUsers = await this.accountsAdapter.listOrganizationUsers({
      userId: command.userId,
      organizationId: command.organizationId,
    });

    const displayNameMap = new Map(
      orgUsers.users.map((u) => [u.userId, u.displayName]),
    );

    return {
      members: memberships.map((m) => ({
        userId: m.userId,
        spaceId: m.spaceId,
        displayName: displayNameMap.get(m.userId) ?? m.userId,
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
      organizationId: command.organizationId,
      spaceId: command.spaceId,
      members: command.members.map((m) => ({
        userId: m.userId as UserId,
        role: m.role as UserSpaceRole,
      })),
    });

    return {
      memberships: memberships.map((m) => ({
        userId: m.userId,
        spaceId: m.spaceId,
        role: m.role,
      })),
    };
  }

  async removeMemberFromSpace(command: {
    userId: string;
    organizationId: OrganizationId;
    spaceId: SpaceId;
    targetUserId: UserId;
  }): Promise<RemoveMemberFromSpaceResponse> {
    return this.spacesAdapter.removeMemberFromSpace({
      userId: command.userId,
      organizationId: command.organizationId,
      spaceId: command.spaceId,
      targetUserId: command.targetUserId,
    });
  }

  async updateMemberRole(command: {
    userId: string;
    organizationId: OrganizationId;
    spaceId: SpaceId;
    targetUserId: UserId;
    role: UserSpaceRole;
  }): Promise<UpdateMemberRoleResponse> {
    return this.spacesAdapter.updateMemberRole({
      userId: command.userId,
      organizationId: command.organizationId,
      spaceId: command.spaceId,
      targetUserId: command.targetUserId,
      role: command.role,
    });
  }
}
