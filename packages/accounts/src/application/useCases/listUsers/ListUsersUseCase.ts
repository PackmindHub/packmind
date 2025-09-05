import { UserService } from '../../services/UserService';
import { PackmindLogger } from '@packmind/shared';
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

  async execute(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _command: ListUsersCommand,
  ): Promise<ListUsersResponse> {
    this.logger.info('Executing list users use case');

    try {
      const users = await this.userService.listUsers();
      this.logger.info('List users use case executed successfully', {
        count: users.length,
      });
      return { users };
    } catch (error) {
      this.logger.error('Failed to execute list users use case', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
