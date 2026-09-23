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
  DanglingInvitationError,
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

    const invitationToken = createInvitationToken(command.token);
    const invitation =
      await this.invitationService.findByToken(invitationToken);

    if (!invitation) {
      this.logger.warn('Invitation not found', {
        token: this.maskToken(command.token),
      });
      throw new InvitationNotFoundError();
    }

    const now = new Date();
    if (invitation.expirationDate < now) {
      this.logger.warn('Invitation expired', {
        invitationId: invitation.id,
        expirationDate: invitation.expirationDate,
      });
      throw new InvitationExpiredError();
    }

    const user = await this.userService.getUserById(invitation.userId);

    if (!user) {
      throw new DanglingInvitationError(String(invitation.id));
    }

    // Load-bearing, not a formality. The update and the invitation delete
    // below are separate writes, so a delete that fails leaves the token
    // resolving against an already-active user, and two concurrent
    // activations can both pass the lookup above. Without this guard those
    // cases fall through and rewrite the password from `command`, letting
    // whoever holds a spent token take the account over.
    if (user.active) {
      this.logger.warn('User is already active', {
        userId: user.id,
        email: maskEmail(user.email),
      });
      // Report success anyway rather than failing an already-done activation.
      return {
        success: true,
        user: {
          id: user.id as string,
          email: user.email,
          isActive: true,
        },
      };
    }

    const passwordHash = await this.userService.hashPassword(command.password);

    const updatedUser = {
      ...user,
      passwordHash,
      active: true,
    };

    await this.userService.updateUser(updatedUser);

    // Hard delete, not a soft one: the token must stop resolving.
    await this.invitationService.delete(invitation.id);

    this.logger.info('User account activated successfully', {
      userId: updatedUser.id,
      email: maskEmail(updatedUser.email),
    });

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
  }

  private maskToken(token: string): string {
    const tokenStr = token;
    if (tokenStr.length <= 8) {
      return '***';
    }
    return `${tokenStr.slice(0, 4)}***${tokenStr.slice(-4)}`;
  }
}
