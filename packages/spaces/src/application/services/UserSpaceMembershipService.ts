import { PackmindLogger } from '@packmind/logger';
import {
  OrganizationId,
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
    });

    this.logger.info('Member added to default space successfully', {
      userId,
      spaceId: defaultSpace.id,
      organizationId,
    });

    return membership;
  }
}
