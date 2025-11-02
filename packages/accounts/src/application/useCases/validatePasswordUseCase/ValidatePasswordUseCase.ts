import { UserService } from '../../services/UserService';
import { PackmindLogger } from '@packmind/shared';
import {
  IValidatePasswordUseCase,
  ValidatePasswordCommand,
  ValidatePasswordResponse,
} from '@packmind/shared';

const origin = 'ValidatePasswordUseCase';

export class ValidatePasswordUseCase implements IValidatePasswordUseCase {
  constructor(
    private readonly userService: UserService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('ValidatePasswordUseCase initialized');
  }

  async execute(
    command: ValidatePasswordCommand,
  ): Promise<ValidatePasswordResponse> {
    const { password, hash } = command;

    this.logger.info('Executing validate password use case');

    if (!password || !hash) {
      const error = new Error('Password and hash are required for validation');
      this.logger.error('Failed to execute validate password use case', {
        error: error.message,
      });
      throw error;
    }

    try {
      const isValid = await this.userService.validatePassword(password, hash);

      this.logger.info('Validate password use case executed successfully', {
        isValid,
      });
      return { isValid };
    } catch (error) {
      this.logger.error('Failed to execute validate password use case', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
