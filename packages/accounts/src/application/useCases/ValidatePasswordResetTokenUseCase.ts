import {
  ValidatePasswordResetTokenCommand,
  ValidatePasswordResetTokenResponse,
  IValidatePasswordResetTokenUseCase,
} from '@packmind/types';
import { PackmindLogger, maskEmail } from '@packmind/logger';
import { PasswordResetTokenService } from '../services/PasswordResetTokenService';
import { UserService } from '../services/UserService';
import { createPasswordResetToken } from '../../domain/entities/PasswordResetToken';

const origin = 'ValidatePasswordResetTokenUseCase';

export class ValidatePasswordResetTokenUseCase implements IValidatePasswordResetTokenUseCase {
  constructor(
    private readonly passwordResetTokenService: PasswordResetTokenService,
    private readonly userService: UserService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('ValidatePasswordResetTokenUseCase initialized');
  }

  async execute(
    command: ValidatePasswordResetTokenCommand,
  ): Promise<ValidatePasswordResetTokenResponse> {
    this.logger.info('Executing ValidatePasswordResetTokenUseCase', {
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
        return {
          email: '',
          isValid: false,
        };
      }

      const now = new Date();
      if (passwordResetToken.expirationDate < now) {
        this.logger.warn('Password reset token expired', {
          tokenId: passwordResetToken.id,
          expirationDate: passwordResetToken.expirationDate,
        });
        return {
          email: '',
          isValid: false,
        };
      }

      const user = await this.userService.getUserById(
        passwordResetToken.userId,
      );

      if (!user) {
        this.logger.error('User not found for password reset token', {
          tokenId: passwordResetToken.id,
          userId: passwordResetToken.userId,
        });
        return {
          email: '',
          isValid: false,
        };
      }

      if (!user.active) {
        this.logger.warn('Password reset token for inactive user', {
          userId: user.id,
          email: maskEmail(user.email),
        });
        return {
          email: '',
          isValid: false,
        };
      }

      this.logger.info('Password reset token validated successfully', {
        tokenId: passwordResetToken.id,
        email: maskEmail(user.email),
      });

      return {
        email: user.email,
        isValid: true,
      };
    } catch (error) {
      this.logger.error('Failed to validate password reset token', {
        token: this.maskToken(command.token),
        error: error instanceof Error ? error.message : String(error),
      });

      // For security reasons, return invalid for any error
      return {
        email: '',
        isValid: false,
      };
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
