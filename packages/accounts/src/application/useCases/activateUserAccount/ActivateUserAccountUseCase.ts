import { maskEmail, PackmindLogger } from '@packmind/logger';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import {
  ActivateUserAccountCommand,
  ActivateUserAccountResponse,
  IActivateUserAccountUseCase,
  UserJoinedOrganizationEvent,
} from '@packmind/types';
import { createInvitationToken } from '../../../domain/entities/Invitation';
import {
  InvitationExpiredError,
  InvitationNotFoundError,
  UserNotFoundError,
} from '../../../domain/errors';
import { InvitationService } from '../../services/InvitationService';
import { UserService } from '../../services/UserService';

const origin = 'ActivateUserAccountUseCase';

export class ActivateUserAccountUseCase implements IActivateUserAccountUseCase {
  constructor(
    private readonly userService: UserService,
    private readonly invitationService: InvitationService,
    private readonly eventEmitterService: PackmindEventEmitterService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('ActivateUserAccountUseCase initialized');
  }

  async execute(
    command: ActivateUserAccountCommand,
  ): Promise<ActivateUserAccountResponse> {
    this.logger.info('Executing ActivateUserAccountUseCase', {
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
        throw new InvitationNotFoundError();
      }

      // 2. Check if invitation is expired
      const now = new Date();
      if (invitation.expirationDate < now) {
        this.logger.warn('Invitation expired', {
          invitationId: invitation.id,
          expirationDate: invitation.expirationDate,
        });
        throw new InvitationExpiredError();
      }

      // 3. Get the user associated with the invitation
      const user = await this.userService.getUserById(invitation.userId);

      if (!user) {
        this.logger.error('User not found for invitation', {
          invitationId: invitation.id,
          userId: invitation.userId,
        });
        throw new UserNotFoundError({ userId: String(invitation.userId) });
      }

      // 4. Check if user is already active (shouldn't happen but safety check)
      if (user.active) {
        this.logger.warn('User is already active', {
          userId: user.id,
          email: maskEmail(user.email),
        });
        // Still return success but don't generate new token
        return {
          success: true,
          user: {
            id: user.id as string,
            email: user.email,
            isActive: true,
          },
        };
      }

      // 5. Hash the password
      const passwordHash = await this.userService.hashPassword(
        command.password,
      );

      // 6. Update user as active with password hash
      const updatedUser = {
        ...user,
        passwordHash,
        active: true,
      };

      await this.userService.updateUser(updatedUser);

      // 7. Hard delete the invitation
      await this.invitationService.delete(invitation.id);

      this.logger.info('User account activated successfully', {
        userId: updatedUser.id,
        email: maskEmail(updatedUser.email),
      });

      // Emit event for user joining organization
      const organizationId = updatedUser.memberships[0]?.organizationId;
      if (organizationId) {
        this.eventEmitterService.emit(
          new UserJoinedOrganizationEvent({
            userId: updatedUser.id,
            organizationId,
            email: updatedUser.email,
            source: 'ui',
          }),
        );
      }

      return {
        success: true,
        user: {
          id: updatedUser.id as string,
          email: updatedUser.email,
          isActive: true,
        },
      };
    } catch (error) {
      this.logger.error('Failed to activate user account', {
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
