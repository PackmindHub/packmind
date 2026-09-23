import { UserService } from '../../services/UserService';
import { PackmindLogger } from '@packmind/logger';
import {
  IValidatePasswordUseCase,
  ValidatePasswordCommand,
  ValidatePasswordResponse,
} from '@packmind/types';
import { PasswordAndHashRequiredError } from '../../../domain/errors';

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
      throw new PasswordAndHashRequiredError();
    }

    const isValid = await this.userService.validatePassword(password, hash);

    this.logger.info('Validate password use case executed successfully', {
      isValid,
    });
    return { isValid };
  }
}
