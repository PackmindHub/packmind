import { PackmindLogger, maskEmail } from '@packmind/logger';
import {
  IValidateInvitationTokenUseCase,
  ValidateInvitationTokenCommand,
  ValidateInvitationTokenResponse,
} from '@packmind/types';
import { InvitationService } from '../../services/InvitationService';
import { UserService } from '../../services/UserService';
import { createInvitationToken } from '../../../domain/entities/Invitation';

const origin = 'ValidateInvitationTokenUseCase';

export class ValidateInvitationTokenUseCase implements IValidateInvitationTokenUseCase {
  constructor(
    private readonly invitationService: InvitationService,
    private readonly userService: UserService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('ValidateInvitationTokenUseCase initialized');
  }

  async execute(
    command: ValidateInvitationTokenCommand,
  ): Promise<ValidateInvitationTokenResponse> {
    this.logger.info('Executing ValidateInvitationTokenUseCase', {
      token: this.maskToken(command.token),
    });

    try {
      // 1. Find invitation by token
      const invitationToken = createInvitationToken(command.token);
      const invitation =
        await this.invitationService.findByToken(invitationToken);

      if (!invitation) {
        this.logger.warn('Invitation not found', {
          token: this.maskToken(command.token),
        });
        return {
          email: '',
          isValid: false,
        };
      }

      // 2. Check if invitation is expired
      const now = new Date();
      if (invitation.expirationDate < now) {
        this.logger.warn('Invitation expired', {
          invitationId: invitation.id,
          expirationDate: invitation.expirationDate,
        });
        return {
          email: '',
          isValid: false,
        };
      }

      // 3. Get the user associated with the invitation to get email
      const user = await this.userService.getUserById(invitation.userId);

      if (!user) {
        this.logger.error('User not found for invitation', {
          invitationId: invitation.id,
          userId: invitation.userId,
        });
        return {
          email: '',
          isValid: false,
        };
      }

      // 4. Check if user is already active (invitation already used)
      if (user.active) {
        this.logger.warn('User is already active (invitation already used)', {
          userId: user.id,
          email: maskEmail(user.email),
        });
        return {
          email: '',
          isValid: false,
        };
      }

      this.logger.info('Invitation token validated successfully', {
        invitationId: invitation.id,
        email: this.maskEmail(user.email),
      });

      return {
        email: user.email,
        isValid: true,
      };
    } catch (error) {
      this.logger.error('Failed to validate invitation token', {
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

  private maskEmail(email: string): string {
    const [localPart, domain] = email.split('@');
    if (!domain) {
      return '***';
    }
    const visible = localPart.slice(0, 2);
    return `${visible}***@${domain}`;
  }
}
