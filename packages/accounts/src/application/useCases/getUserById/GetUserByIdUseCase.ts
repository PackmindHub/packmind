import { UserService } from '../../services/UserService';
import { PackmindLogger } from '@packmind/shared';
import {
  IGetUserByIdUseCase,
  GetUserByIdCommand,
  GetUserByIdResponse,
} from '@packmind/shared';

const origin = 'GetUserByIdUseCase';

export class GetUserByIdUseCase implements IGetUserByIdUseCase {
  constructor(
    private readonly userService: UserService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('GetUserByIdUseCase initialized');
  }

  async execute(command: GetUserByIdCommand): Promise<GetUserByIdResponse> {
    const { userId } = command;
    this.logger.info('Executing get user by ID use case', { userId });

    try {
      const user = await this.userService.getUserById(userId);
      this.logger.info('Get user by ID use case executed successfully', {
        userId,
        found: !!user,
      });
      return { user };
    } catch (error) {
      this.logger.error('Failed to execute get user by ID use case', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
