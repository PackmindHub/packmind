import { Repository } from 'typeorm';
import {
  UserSpaceMembership,
  UserId,
  SpaceId,
  UserSpaceRole,
} from '@packmind/types';
import { OrganizationId } from '@packmind/types';
import { IUserSpaceMembershipRepository } from '../../domain/repositories/IUserSpaceMembershipRepository';
import { UserSpaceMembershipSchema } from '../schemas/UserSpaceMembershipSchema';
import { PackmindLogger } from '@packmind/logger';
import { WithTimestamps, localDataSource } from '@packmind/node-utils';

const origin = 'UserSpaceMembershipRepository';

type MembershipEntity = WithTimestamps<UserSpaceMembership>;

export class UserSpaceMembershipRepository implements IUserSpaceMembershipRepository {
  constructor(
    private readonly repository: Repository<MembershipEntity> = localDataSource.getRepository(
      UserSpaceMembershipSchema,
    ),
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('UserSpaceMembershipRepository initialized');
  }

  async addMembership(
    membership: UserSpaceMembership,
  ): Promise<UserSpaceMembership> {
    this.logger.info('Adding membership', {
      userId: membership.userId,
      spaceId: membership.spaceId,
    });

    try {
      const result = await this.repository.save(membership);

      this.logger.info('Membership added', {
        userId: membership.userId,
        spaceId: membership.spaceId,
      });
      return result;
    } catch (error) {
      this.logger.error('Failed to add membership', {
        userId: membership.userId,
        spaceId: membership.spaceId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async removeMembership(userId: UserId, spaceId: SpaceId): Promise<boolean> {
    this.logger.info('Removing membership', { userId, spaceId });

    try {
      const deleteResult = await this.repository.delete({
        userId,
        spaceId,
      });

      const removed = (deleteResult.affected ?? 0) > 0;
      this.logger.info('Membership removal attempted', {
        userId,
        spaceId,
        removed,
      });
      return removed;
    } catch (error) {
      this.logger.error('Failed to remove membership', {
        userId,
        spaceId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findMembership(
    userId: UserId,
    spaceId: SpaceId,
  ): Promise<UserSpaceMembership | null> {
    this.logger.info('Finding membership', { userId, spaceId });

    try {
      const membership = await this.repository.findOne({
        where: { userId, spaceId },
      });
      this.logger.info('Membership lookup completed', {
        userId,
        spaceId,
        found: !!membership,
      });
      return membership;
    } catch (error) {
      this.logger.error('Failed to find membership', {
        userId,
        spaceId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findByUserId(userId: UserId): Promise<UserSpaceMembership[]> {
    this.logger.info('Finding memberships by userId', { userId });

    try {
      const memberships = await this.repository.find({ where: { userId } });
      this.logger.info('Memberships found by userId', {
        userId,
        count: memberships.length,
      });
      return memberships;
    } catch (error) {
      this.logger.error('Failed to find memberships by userId', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findBySpaceId(spaceId: SpaceId): Promise<UserSpaceMembership[]> {
    this.logger.info('Finding memberships by spaceId', { spaceId });

    try {
      const memberships = await this.repository.find({ where: { spaceId } });
      this.logger.info('Memberships found by spaceId', {
        spaceId,
        count: memberships.length,
      });
      return memberships;
    } catch (error) {
      this.logger.error('Failed to find memberships by spaceId', {
        spaceId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async updateMembershipRole(
    userId: UserId,
    spaceId: SpaceId,
    role: UserSpaceRole,
  ): Promise<boolean> {
    this.logger.info('Updating membership role', { userId, spaceId, role });

    try {
      const updateResult = await this.repository.update(
        { userId, spaceId },
        { role },
      );

      const updated = (updateResult.affected ?? 0) > 0;
      this.logger.info('Membership role update attempted', {
        userId,
        spaceId,
        role,
        updated,
      });
      return updated;
    } catch (error) {
      this.logger.error('Failed to update membership role', {
        userId,
        spaceId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async removeByUserAndOrganization(
    userId: UserId,
    organizationId: OrganizationId,
  ): Promise<number> {
    this.logger.info('Removing memberships by user and organization', {
      userId,
      organizationId,
    });

    try {
      const memberships = await this.repository
        .createQueryBuilder('membership')
        .innerJoin('membership.space', 'space')
        .where('membership.userId = :userId', { userId })
        .andWhere('space.organizationId = :organizationId', { organizationId })
        .andWhere('space.deletedAt IS NULL')
        .getMany();

      if (memberships.length === 0) {
        this.logger.info('No memberships to remove for user in organization', {
          userId,
          organizationId,
        });
        return 0;
      }

      const spaceIds = memberships.map((m) => m.spaceId);
      const deleteResult = await this.repository
        .createQueryBuilder()
        .delete()
        .where('userId = :userId', { userId })
        .andWhere('spaceId IN (:...spaceIds)', { spaceIds })
        .execute();

      const removed = deleteResult.affected ?? 0;
      this.logger.info('Memberships removed by user and organization', {
        userId,
        organizationId,
        removed,
      });
      return removed;
    } catch (error) {
      this.logger.error(
        'Failed to remove memberships by user and organization',
        {
          userId,
          organizationId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  async findByUserAndOrganization(
    userId: UserId,
    organizationId: OrganizationId,
  ): Promise<UserSpaceMembership[]> {
    this.logger.info('Finding memberships by user and organization', {
      userId,
      organizationId,
    });

    try {
      const memberships = await this.repository
        .createQueryBuilder('membership')
        .innerJoinAndSelect('membership.space', 'space')
        .where('membership.userId = :userId', { userId })
        .andWhere('space.organizationId = :organizationId', { organizationId })
        .andWhere('space.deletedAt IS NULL')
        .getMany();

      this.logger.info('Memberships found by user and organization', {
        userId,
        organizationId,
        count: memberships.length,
      });
      return memberships;
    } catch (error) {
      this.logger.error('Failed to find memberships by user and organization', {
        userId,
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
