import { Repository } from 'typeorm';
import {
  UserOrganizationMembership,
  UserId,
  UserOrganizationRole,
} from '../../domain/entities/User';
import { OrganizationId } from '../../domain/entities/Organization';
import { IUserOrganizationMembershipRepository } from '../../domain/repositories/IUserOrganizationMembershipRepository';
import { UserOrganizationMembershipSchema } from '../schemas/UserOrganizationMembershipSchema';
import {
  PackmindLogger,
  WithTimestamps,
  localDataSource,
} from '@packmind/shared';

const origin = 'UserOrganizationMembershipRepository';

type MembershipEntity = WithTimestamps<UserOrganizationMembership>;

export class UserOrganizationMembershipRepository
  implements IUserOrganizationMembershipRepository
{
  constructor(
    private readonly repository: Repository<MembershipEntity> = localDataSource.getRepository(
      UserOrganizationMembershipSchema,
    ),
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('UserOrganizationMembershipRepository initialized');
  }

  async removeMembership(
    userId: UserId,
    organizationId: OrganizationId,
  ): Promise<boolean> {
    this.logger.info('Removing membership', { userId, organizationId });

    try {
      const result = await this.repository.manager.transaction(
        async (manager) => {
          const deleteResult = await manager.delete(
            UserOrganizationMembershipSchema,
            {
              userId,
              organizationId,
            },
          );

          return deleteResult.affected ?? 0;
        },
      );

      const removed = result > 0;
      this.logger.info('Membership removal attempted', {
        userId,
        organizationId,
        removed,
      });
      return removed;
    } catch (error) {
      this.logger.error('Failed to remove membership', {
        userId,
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async updateRole(
    userId: UserId,
    organizationId: OrganizationId,
    newRole: UserOrganizationRole,
  ): Promise<boolean> {
    this.logger.info('Updating user role', { userId, organizationId, newRole });

    try {
      const result = await this.repository.manager.transaction(
        async (manager) => {
          const updateResult = await manager.update(
            UserOrganizationMembershipSchema,
            {
              userId,
              organizationId,
            },
            {
              role: newRole,
            },
          );

          return updateResult.affected ?? 0;
        },
      );

      const updated = result > 0;
      this.logger.info('Role update attempted', {
        userId,
        organizationId,
        newRole,
        updated,
      });
      return updated;
    } catch (error) {
      this.logger.error('Failed to update role', {
        userId,
        organizationId,
        newRole,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
