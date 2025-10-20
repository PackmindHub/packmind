import {
  ICheckEmailAvailabilityUseCase,
  CheckEmailAvailabilityCommand,
  CheckEmailAvailabilityResponse,
} from '@packmind/shared';
import { UserService } from '../../services/UserService';
import { PackmindLogger, LogLevel, maskEmail } from '@packmind/shared';

const origin = 'CheckEmailAvailabilityUseCase';

export class CheckEmailAvailabilityUseCase
  implements ICheckEmailAvailabilityUseCase
{
  private readonly logger: PackmindLogger;

  constructor(private readonly userService: UserService) {
    this.logger = new PackmindLogger(origin, LogLevel.INFO);
    this.logger.info('CheckEmailAvailabilityUseCase initialized');
  }

  async execute(
    command: CheckEmailAvailabilityCommand,
  ): Promise<CheckEmailAvailabilityResponse> {
    const { email } = command;

    this.logger.info('Checking email availability', {
      email: maskEmail(email),
    });

    try {
      // Check if user already exists (case-insensitive)
      const existingUser =
        await this.userService.getUserByEmailCaseInsensitive(email);

      const available = !existingUser;

      this.logger.info('Email availability checked', {
        email: maskEmail(email),
        available,
      });

      return { available };
    } catch (error) {
      this.logger.error('Failed to check email availability', {
        email: maskEmail(email),
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
