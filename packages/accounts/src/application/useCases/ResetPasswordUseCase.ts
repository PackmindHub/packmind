import {
  ResetPasswordCommand,
  ResetPasswordResponse,
  IResetPasswordUseCase,
} from '@packmind/types';
import { PackmindLogger, maskEmail } from '@packmind/logger';
import { UserService } from '../services/UserService';
import { PasswordResetTokenService } from '../services/PasswordResetTokenService';
import { LoginRateLimiterService } from '../services/LoginRateLimiterService';
import {
  PasswordResetTokenNotFoundError,
  PasswordResetTokenExpiredError,
  UserNotFoundError,
} from '../../domain/errors';
import { createPasswordResetToken } from '../../domain/entities/PasswordResetToken';

const origin = 'ResetPasswordUseCase';

export class ResetPasswordUseCase implements IResetPasswordUseCase {
  constructor(
    private readonly userService: UserService,
    private readonly passwordResetTokenService: PasswordResetTokenService,
    private readonly loginRateLimiterService: LoginRateLimiterService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('ResetPasswordUseCase initialized');
  }

  async execute(command: ResetPasswordCommand): Promise<ResetPasswordResponse> {
    this.logger.info('Executing ResetPasswordUseCase', {
      token: this.maskToken(command.token),
    });

    try {
      const resetToken = createPasswordResetToken(command.token);
      const passwordResetToken =
        await this.passwordResetTokenService.findByToken(resetToken);

      if (!passwordResetToken) {
        this.logger.warn('Password reset token not found', {
          token: this.maskToken(command.token),
        });
        throw new PasswordResetTokenNotFoundError();
      }

      const now = new Date();
      if (passwordResetToken.expirationDate < now) {
        this.logger.warn('Password reset token expired', {
          tokenId: passwordResetToken.id,
          expirationDate: passwordResetToken.expirationDate,
        });
        throw new PasswordResetTokenExpiredError();
      }

      const user = await this.userService.getUserById(
        passwordResetToken.userId,
      );

      if (!user) {
        this.logger.error('User not found for password reset token', {
          tokenId: passwordResetToken.id,
          userId: passwordResetToken.userId,
        });
        throw new UserNotFoundError({
          userId: String(passwordResetToken.userId),
        });
      }

      if (!user.active) {
        this.logger.warn('Password reset attempted for inactive user', {
          userId: user.id,
          email: maskEmail(user.email),
        });
        throw new PasswordResetTokenNotFoundError(); // Generic error to prevent enumeration
      }

      const passwordHash = await this.userService.hashPassword(
        command.password,
      );

      const updatedUser = {
        ...user,
        passwordHash,
      };

      await this.userService.updateUser(updatedUser);

      // A user who just reset their password must not stay locked out by the
      // failed attempts that led them here.
      await this.loginRateLimiterService.clearAttempts(user.email);

      // Hard delete, not a soft one: the token is single-use.
      await this.passwordResetTokenService.delete(passwordResetToken.id);

      this.logger.info('Password reset completed successfully', {
        userId: updatedUser.id,
        email: maskEmail(updatedUser.email),
      });

      return {
        success: true,
        user: {
          id: updatedUser.id as string,
          email: updatedUser.email,
          isActive: updatedUser.active,
        },
      };
    } catch (error) {
      this.logger.error('Failed to reset password', {
        token: this.maskToken(command.token),
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private maskToken(token: string): string {
    const tokenStr = token;
    if (tokenStr.length <= 8) {
      return '***';
    }
    return `${tokenStr.slice(0, 4)}***${tokenStr.slice(-4)}`;
  }
}
