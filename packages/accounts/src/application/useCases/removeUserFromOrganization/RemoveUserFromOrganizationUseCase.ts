import { PackmindLogger } from '@packmind/logger';
import {
  IRemoveUserFromOrganizationUseCase,
  RemoveUserFromOrganizationCommand,
  RemoveUserFromOrganizationResponse,
  OrganizationProvider,
  UserProvider,
} from '@packmind/types';
import { AbstractAdminUseCase, AdminContext } from '@packmind/node-utils';
import { UserService } from '../../services/UserService';
import { User, createUserId } from '@packmind/types';
import { createOrganizationId } from '@packmind/types';
import {
  UserNotFoundError,
  UserCannotExcludeSelfError,
} from '../../../domain/errors';

const origin = 'RemoveUserFromOrganizationUseCase';

export class RemoveUserFromOrganizationUseCase
  extends AbstractAdminUseCase<
    RemoveUserFromOrganizationCommand,
    RemoveUserFromOrganizationResponse
  >
  implements IRemoveUserFromOrganizationUseCase
{
  constructor(
    userProvider: UserProvider,
    organizationProvider: OrganizationProvider,
    readonly userService: UserService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(userProvider, organizationProvider, logger);
    this.logger.info('RemoveUserFromOrganizationUseCase initialized');
  }

  async executeForAdmins(
    command: RemoveUserFromOrganizationCommand & AdminContext,
  ): Promise<RemoveUserFromOrganizationResponse> {
    const {
      userId,
      organizationId,
      targetUserId,
      user: requestingUser,
    } = command;

    this.logger.info('Executing remove user from organization use case', {
      organizationId,
      requestingUserId: userId,
      targetUserId,
    });

    if (userId === targetUserId) {
      this.logger.error('Self-exclusion attempt detected', {
        userId,
        organizationId,
      });
      throw new UserCannotExcludeSelfError();
    }

    try {
      const targetUser = await this.getExistingUser(createUserId(targetUserId));

      await this.userService.excludeUserFromOrganization({
        requestingUser,
        targetUser,
        organizationId: createOrganizationId(organizationId),
      });

      this.logger.info('User removed from organization', {
        organizationId,
        requestingUserId: userId,
        targetUserId,
      });

      return { removed: true };
    } catch (error) {
      this.logger.error('Failed to remove user from organization', {
        organizationId,
        requestingUserId: userId,
        targetUserId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async getExistingUser(userId: User['id']): Promise<User> {
    const user = await this.userService.getUserById(userId);

    if (!user) {
      throw new UserNotFoundError({ userId: String(userId) });
    }

    return user;
  }
}
