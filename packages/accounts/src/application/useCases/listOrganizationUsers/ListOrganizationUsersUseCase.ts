import { UserProvider, OrganizationProvider } from '@packmind/types';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';
import {
  IListOrganizationUsersUseCase,
  ListOrganizationUsersCommand,
  ListOrganizationUsersResponse,
  OrganizationUser,
} from '@packmind/types';
import { UserService } from '../../services/UserService';

const origin = 'ListOrganizationUsersUseCase';

export class ListOrganizationUsersUseCase
  extends AbstractMemberUseCase<
    ListOrganizationUsersCommand,
    ListOrganizationUsersResponse
  >
  implements IListOrganizationUsersUseCase
{
  constructor(
    userProvider: UserProvider,
    organizationProvider: OrganizationProvider,
    private readonly userService: UserService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(userProvider, organizationProvider, logger);
    logger.info('ListOrganizationUsersUseCase initialized');
  }

  async executeForMembers(
    command: ListOrganizationUsersCommand & MemberContext,
  ): Promise<ListOrganizationUsersResponse> {
    this.logger.info('Fetching users for organization', {
      organizationId: command.organizationId,
    });

    // Get users by organization directly from database
    const users = await this.userService.listUsersByOrganization(
      command.organizationId,
    );

    if (users.length === 0) {
      this.logger.info('No users found in organization', {
        organizationId: command.organizationId,
      });
      return { users: [] };
    }

    // Map to organization users with userId, email and role
    const organizationUsers: OrganizationUser[] = users.map((user) => {
      const membership = user.memberships?.find(
        (m) => m.organizationId === command.organizationId,
      );

      return {
        userId: user.id,
        email: user.email,
        role: membership?.role || 'member',
      };
    });

    this.logger.info('Users fetched successfully', {
      organizationId: command.organizationId,
      userCount: organizationUsers.length,
    });

    return { users: organizationUsers };
  }
}
