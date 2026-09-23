import { PackmindLogger } from '@packmind/logger';
import { AbstractAdminUseCase, AdminContext } from '@packmind/node-utils';
import {
  ChangeUserRoleCommand,
  ChangeUserRoleResponse,
  createOrganizationId,
  createUserId,
  IAccountsPort,
  IChangeUserRoleUseCase,
} from '@packmind/types';
import {
  UserCannotChangeOwnRoleError,
  CannotDemoteLastAdminError,
  FailedToUpdateUserRoleError,
} from '../../../domain/errors';
import { UserNotFoundError } from '@packmind/node-utils';
import { UserService } from '../../services/UserService';

const origin = 'ChangeUserRoleUseCase';

export class ChangeUserRoleUseCase
  extends AbstractAdminUseCase<ChangeUserRoleCommand, ChangeUserRoleResponse>
  implements IChangeUserRoleUseCase
{
  constructor(
    accountsPort: IAccountsPort,
    private readonly userService: UserService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
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

    if (command.targetUserId === command.userId) {
      throw new UserCannotChangeOwnRoleError();
    }

    const targetUserId = createUserId(command.targetUserId);
    const organizationId = createOrganizationId(command.organizationId);
    const targetUser = await this.userService.getUserById(targetUserId);
    const targetMembership = targetUser?.memberships?.find(
      (membership) => membership.organizationId === organizationId,
    );

    // A user of another organization is answered exactly like a missing one,
    // so the status never confirms to an admin that a foreign user id is real.
    if (!targetUser || !targetMembership) {
      throw new UserNotFoundError({
        userId: String(targetUserId),
        organizationId: String(organizationId),
      });
    }

    if (targetMembership.role === 'admin' && command.newRole !== 'admin') {
      const orgUsers =
        await this.userService.listUsersByOrganization(organizationId);
      const orgAdmins = orgUsers.filter((user) =>
        user.memberships?.some(
          (membership) =>
            membership.organizationId === organizationId &&
            membership.role === 'admin',
        ),
      );

      if (orgAdmins.length <= 1) {
        throw new CannotDemoteLastAdminError();
      }
    }

    const success = await this.userService.changeUserRole(
      targetUserId,
      organizationId,
      command.newRole,
    );

    if (!success) {
      throw new FailedToUpdateUserRoleError();
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
