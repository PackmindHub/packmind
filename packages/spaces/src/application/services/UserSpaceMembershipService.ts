import { PackmindLogger } from '@packmind/logger';
import {
  OrganizationId,
  Space,
  SpaceId,
  UserId,
  UserSpaceMembership,
  UserSpaceRole,
} from '@packmind/types';
import { ISpaceRepository } from '../../domain/repositories/ISpaceRepository';
import { IUserSpaceMembershipRepository } from '../../domain/repositories/IUserSpaceMembershipRepository';

const origin = 'UserSpaceMembershipService';

export class UserSpaceMembershipService {
  constructor(
    private readonly userSpaceMembershipRepository: IUserSpaceMembershipRepository,
    private readonly spaceRepository: ISpaceRepository,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('UserSpaceMembershipService initialized');
  }

  async addMemberToDefaultSpace(
    userId: UserId,
    organizationId: OrganizationId,
    role: UserSpaceRole,
    createdBy: UserId,
  ): Promise<UserSpaceMembership> {
    this.logger.info('Adding member to default space', {
      userId,
      organizationId,
      role,
    });

    const spaces =
      await this.spaceRepository.findByOrganizationId(organizationId);
    const defaultSpace = spaces.find((space) => space.isDefaultSpace);

    if (!defaultSpace) {
      throw new Error(
        `Default space not found for organization ${organizationId}`,
      );
    }

    const membership = await this.userSpaceMembershipRepository.addMembership({
      userId,
      spaceId: defaultSpace.id,
      role,
      createdBy,
      updatedBy: createdBy,
    });

    this.logger.info('Member added to default space successfully', {
      userId,
      spaceId: defaultSpace.id,
      organizationId,
    });

    return membership;
  }

  async addSpaceMembership(membership: {
    userId: UserId;
    spaceId: SpaceId;
    role: UserSpaceRole;
    createdBy: UserId;
  }): Promise<UserSpaceMembership> {
    return this.userSpaceMembershipRepository.addMembership({
      ...membership,
      updatedBy: membership.createdBy,
    });
  }

  async listSpaceMembers(spaceId: SpaceId): Promise<UserSpaceMembership[]> {
    return this.userSpaceMembershipRepository.findBySpaceId(spaceId);
  }

  async findMembershipsByUserAndOrganization(
    userId: UserId,
    organizationId: OrganizationId,
  ): Promise<UserSpaceMembership[]> {
    return this.userSpaceMembershipRepository.findByUserAndOrganization(
      userId,
      organizationId,
    );
  }

  async findMembership(
    userId: UserId,
    spaceId: SpaceId,
  ): Promise<UserSpaceMembership | null> {
    return this.userSpaceMembershipRepository.findMembership(userId, spaceId);
  }

  async updateMembershipRole(
    userId: UserId,
    spaceId: SpaceId,
    role: UserSpaceRole,
  ): Promise<boolean> {
    return this.userSpaceMembershipRepository.updateMembershipRole(
      userId,
      spaceId,
      role,
    );
  }

  async removeSpaceMembership(
    userId: UserId,
    spaceId: SpaceId,
  ): Promise<boolean> {
    return this.userSpaceMembershipRepository.removeMembership(userId, spaceId);
  }

  async getSpaceById(spaceId: SpaceId): Promise<Space | null> {
    return this.spaceRepository.findById(spaceId);
  }
}
