import { UserService } from '../../services/UserService';
import { PackmindLogger } from '@packmind/shared';
import {
  IGetUserByUsernameUseCase,
  GetUserByUsernameCommand,
  GetUserByUsernameResponse,
} from '../../../domain/useCases/IGetUserByUsernameUseCase';

const origin = 'GetUserByUsernameUseCase';

export class GetUserByUsernameUseCase implements IGetUserByUsernameUseCase {
  constructor(
    private readonly userService: UserService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('GetUserByUsernameUseCase initialized');
  }

  async execute(
    command: GetUserByUsernameCommand,
  ): Promise<GetUserByUsernameResponse> {
    const { username } = command;
    this.logger.info('Executing get user by username use case', { username });

    try {
      const user = await this.userService.getUserByUsername(username);
      this.logger.info('Get user by username use case executed successfully', {
        username,
        found: !!user,
      });
      return { user };
    } catch (error) {
      this.logger.error('Failed to execute get user by username use case', {
        username,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
