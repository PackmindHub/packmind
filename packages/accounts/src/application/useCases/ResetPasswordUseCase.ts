import {
  ResetPasswordCommand,
  ResetPasswordResponse,
  IResetPasswordUseCase,
} from '@packmind/shared/src/types/accounts/contracts/IResetPasswordUseCase';
import { PackmindLogger } from '@packmind/shared';
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
      // 1. Find password reset token by token
      const resetToken = createPasswordResetToken(command.token);
      const passwordResetToken =
        await this.passwordResetTokenService.findByToken(resetToken);

      if (!passwordResetToken) {
        this.logger.warn('Password reset token not found', {
          token: this.maskToken(command.token),
        });
        throw new PasswordResetTokenNotFoundError();
      }

      // 2. Check if token is expired
      const now = new Date();
      if (passwordResetToken.expirationDate < now) {
        this.logger.warn('Password reset token expired', {
          tokenId: passwordResetToken.id,
          expirationDate: passwordResetToken.expirationDate,
        });
        throw new PasswordResetTokenExpiredError();
      }

      // 3. Get the user associated with the token
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

      // 4. Check if user is active (only active users can reset passwords)
      if (!user.active) {
        this.logger.warn('Password reset attempted for inactive user', {
          userId: user.id,
          email: user.email,
        });
        throw new PasswordResetTokenNotFoundError(); // Generic error to prevent enumeration
      }

      // 5. Hash the new password
      const passwordHash = await this.userService.hashPassword(
        command.password,
      );

      // 6. Update user with new password hash
      const updatedUser = {
        ...user,
        passwordHash,
      };

      await this.userService.updateUser(updatedUser);

      // 7. Clear login rate limiter for this user
      await this.loginRateLimiterService.clearAttempts(user.email);

      // 8. Hard delete the password reset token
      await this.passwordResetTokenService.delete(passwordResetToken.id);

      this.logger.info('Password reset completed successfully', {
        userId: updatedUser.id,
        email: this.maskEmail(updatedUser.email),
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

  private maskEmail(email: string): string {
    const [localPart, domain] = email.split('@');
    if (!domain) {
      return '***';
    }
    const visible = localPart.slice(0, 2);
    return `${visible}***@${domain}`;
  }
}
