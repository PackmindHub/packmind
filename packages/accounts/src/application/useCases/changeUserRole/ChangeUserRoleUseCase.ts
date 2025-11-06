import { PackmindLogger } from '@packmind/logger';
import {
  ChangeUserRoleCommand,
  ChangeUserRoleResponse,
  IChangeUserRoleUseCase,
  UserProvider,
  OrganizationProvider,
} from '@packmind/types';
import { AbstractAdminUseCase, AdminContext } from '@packmind/shared';
import { createUserId } from '@packmind/types';
import { createOrganizationId } from '@packmind/types';
import {
  UserNotFoundError,
  UserNotInOrganizationError,
} from '../../../domain/errors';
import { UserService } from '../../services/UserService';

const origin = 'ChangeUserRoleUseCase';

export class ChangeUserRoleUseCase
  extends AbstractAdminUseCase<ChangeUserRoleCommand, ChangeUserRoleResponse>
  implements IChangeUserRoleUseCase
{
  constructor(
    userProvider: UserProvider,
    organizationProvider: OrganizationProvider,
    private readonly userService: UserService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(userProvider, organizationProvider, logger);
    this.logger.info('ChangeUserRoleUseCase initialized');
  }

  async executeForAdmins(
    command: ChangeUserRoleCommand & AdminContext,
  ): Promise<ChangeUserRoleResponse> {
    this.logger.info('Executing ChangeUserRoleUseCase for admin', {
      targetUserId: command.targetUserId,
      newRole: command.newRole,
      organizationId: command.organizationId,
      requesterId: command.userId,
    });

    // Prevent admin from changing their own role (business rule)
    if (command.targetUserId === command.userId) {
      this.logger.warn('Admin attempted to change their own role', {
        userId: command.userId,
        organizationId: command.organizationId,
      });
      throw new Error('Cannot change your own role');
    }

    const targetUserId = createUserId(command.targetUserId);
    const organizationId = createOrganizationId(command.organizationId);
    // Check if the target user exists and is a member of the organization
    const targetUser = await this.userService.getUserById(targetUserId);
    if (!targetUser) {
      this.logger.error('Target user not found', { targetUserId });
      throw new UserNotFoundError({ userId: String(targetUserId) });
    }

    const targetMembership = targetUser.memberships?.find(
      (membership) => membership.organizationId === organizationId,
    );

    if (!targetMembership) {
      this.logger.error('Target user is not a member of the organization', {
        targetUserId,
        organizationId,
      });
      throw new UserNotInOrganizationError({
        userId: String(targetUserId),
        organizationId: String(organizationId),
      });
    }

    // Business rule: Prevent demoting the last admin
    if (targetMembership.role === 'admin' && command.newRole !== 'admin') {
      // Count current admins in the organization
      const allUsers = await this.userService.listUsers();
      const orgAdmins = allUsers.filter((user) =>
        user.memberships?.some(
          (membership) =>
            membership.organizationId === organizationId &&
            membership.role === 'admin',
        ),
      );

      if (orgAdmins.length <= 1) {
        this.logger.warn('Attempted to demote the last admin', {
          targetUserId,
          organizationId,
          currentAdminCount: orgAdmins.length,
        });
        throw new Error(
          'Cannot demote the last administrator of the organization',
        );
      }
    }

    // Update the user's role
    const success = await this.userService.changeUserRole(
      targetUserId,
      organizationId,
      command.newRole,
    );

    if (!success) {
      this.logger.error('Failed to update user role', {
        targetUserId,
        organizationId,
        newRole: command.newRole,
      });
      throw new Error('Failed to update user role');
    }

    this.logger.info('User role changed successfully', {
      targetUserId,
      organizationId,
      newRole: command.newRole,
      changedBy: command.userId,
    });

    return {
      success: true,
      updatedRole: command.newRole,
    };
  }
}
