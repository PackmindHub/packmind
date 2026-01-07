import {
  RequestPasswordResetCommand,
  RequestPasswordResetResponse,
  IRequestPasswordResetUseCase,
} from '@packmind/types';
import { PackmindLogger, maskEmail } from '@packmind/logger';
import { UserService } from '../services/UserService';
import {
  PasswordResetTokenService,
  PasswordResetRequest,
} from '../services/PasswordResetTokenService';
import validator from 'validator';

const origin = 'RequestPasswordResetUseCase';

export class RequestPasswordResetUseCase
  implements IRequestPasswordResetUseCase
{
  constructor(
    private readonly userService: UserService,
    private readonly passwordResetTokenService: PasswordResetTokenService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('RequestPasswordResetUseCase initialized');
  }

  async execute(
    command: RequestPasswordResetCommand,
  ): Promise<RequestPasswordResetResponse> {
    this.logger.info('Executing RequestPasswordResetUseCase', {
      email: maskEmail(command.email),
    });

    // Validate email format
    const trimmedEmail = command.email.trim();
    if (!trimmedEmail || !validator.isEmail(trimmedEmail)) {
      this.logger.warn('Invalid email format provided', {
        email: maskEmail(command.email),
      });
      // Return success to prevent email enumeration
      return {
        success: true,
        message:
          'If your email is registered, you will receive a password reset link shortly.',
      };
    }

    const normalizedEmail = trimmedEmail.toLowerCase();

    // Find user by email (case-insensitive)
    const user =
      await this.userService.getUserByEmailCaseInsensitive(normalizedEmail);

    if (!user) {
      this.logger.info('Password reset requested for non-existent email', {
        email: maskEmail(normalizedEmail),
      });
      // Return success to prevent email enumeration, but don't send email
      return {
        success: true,
        message:
          'If your email is registered, you will receive a password reset link shortly.',
      };
    }

    // Only allow password reset for active users (completed registration)
    if (!user.active) {
      this.logger.info(
        'Password reset requested for inactive user (incomplete registration)',
        {
          userId: user.id,
          email: maskEmail(normalizedEmail),
        },
      );
      // Return success to prevent email enumeration, but don't send email
      return {
        success: true,
        message:
          'If your email is registered, you will receive a password reset link shortly.',
      };
    }

    try {
      // Create password reset token and send email
      const request: PasswordResetRequest = {
        email: user.email,
        user,
      };

      await this.passwordResetTokenService.createPasswordResetToken(request);

      this.logger.info('Password reset token created and email sent', {
        userId: user.id,
        email: maskEmail(user.email),
      });

      return {
        success: true,
        message:
          'If your email is registered, you will receive a password reset link shortly.',
      };
    } catch (error) {
      this.logger.error('Failed to create password reset token', {
        userId: user.id,
        email: maskEmail(user.email),
        error: error instanceof Error ? error.message : String(error),
      });

      // Still return success to prevent information leakage
      // The error is logged for internal monitoring
      return {
        success: true,
        message:
          'If your email is registered, you will receive a password reset link shortly.',
      };
    }
  }
}
