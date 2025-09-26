import { User } from '../../../domain/entities/User';
import { UserService } from '../../services/UserService';
import { PackmindLogger, SanitizedUser } from '@packmind/shared';
import {
  IListUsersUseCase,
  ListUsersCommand,
  ListUsersResponse,
} from '../../../domain/useCases/IListUsersUseCase';

const origin = 'ListUsersUseCase';

export class ListUsersUseCase implements IListUsersUseCase {
  constructor(
    private readonly userService: UserService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('ListUsersUseCase initialized');
  }

  async execute(command: ListUsersCommand): Promise<ListUsersResponse> {
    const { userId, organizationId } = command;

    this.logger.info('Executing list users use case', {
      userId,
      organizationId,
    });

    try {
      const users = await this.userService.listUsers();

      const filteredUsers = organizationId
        ? users.filter((user) =>
            user.memberships?.some(
              (membership) => membership.organizationId === organizationId,
            ),
          )
        : users;

      const sanitizedUsers = filteredUsers.map((user) => {
        const safeUser = { ...user } as Partial<User>;

        delete safeUser.memberships;
        delete safeUser.passwordHash;

        return safeUser as SanitizedUser;
      });

      this.logger.info('List users use case executed successfully', {
        count: sanitizedUsers.length,
        organizationId,
      });
      return { users: sanitizedUsers };
    } catch (error) {
      this.logger.error('Failed to execute list users use case', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
