import { UserService } from '../../services/UserService';
import { PackmindLogger } from '@packmind/logger';
import {
  IListUserOrganizationsUseCase,
  ListUserOrganizationsCommand,
  ListUserOrganizationsResponse,
} from '@packmind/types';
import { Organization } from '@packmind/types';

const origin = 'ListUserOrganizationsUseCase';

export class ListUserOrganizationsUseCase
  implements IListUserOrganizationsUseCase
{
  constructor(
    private readonly userService: UserService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('ListUserOrganizationsUseCase initialized');
  }

  async execute(
    command: ListUserOrganizationsCommand,
  ): Promise<ListUserOrganizationsResponse> {
    const { userId } = command;
    this.logger.info('Executing list user organizations use case', { userId });

    try {
      const user = await this.userService.getUserById(userId);

      if (!user) {
        this.logger.info('User not found', { userId });
        return { organizations: [] };
      }

      // Extract organizations from user memberships
      const organizations: Organization[] = user.memberships
        .filter((membership) => membership.organization)
        .map((membership) => membership.organization as Organization);

      this.logger.info(
        'List user organizations use case executed successfully',
        {
          userId,
          organizationCount: organizations.length,
        },
      );
      return { organizations };
    } catch (error) {
      this.logger.error('Failed to execute list user organizations use case', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
