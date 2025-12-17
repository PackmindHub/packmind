import { PackmindLogger } from '@packmind/logger';
import {
  AbstractAdminUseCase,
  AdminContext,
  Configuration,
  removeTrailingSlash,
} from '@packmind/node-utils';
import {
  IAccountsPort,
  IListOrganizationUserStatusesUseCase,
  InvitationStatus,
  ListOrganizationUserStatusesCommand,
  ListOrganizationUserStatusesResponse,
  User,
  UserStatus,
} from '@packmind/types';
import {
  Invitation,
  InvitationToken,
} from '../../../domain/entities/Invitation';
import { InvitationService } from '../../services/InvitationService';
import { UserService } from '../../services/UserService';

const origin = 'ListOrganizationUserStatusesUseCase';

export class ListOrganizationUserStatusesUseCase
  extends AbstractAdminUseCase<
    ListOrganizationUserStatusesCommand,
    ListOrganizationUserStatusesResponse
  >
  implements IListOrganizationUserStatusesUseCase
{
  private static readonly DEFAULT_APP_WEB_URL = 'http://localhost:8081';

  constructor(
    accountsPort: IAccountsPort,
    private readonly userService: UserService,
    private readonly invitationService: InvitationService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
    logger.info('ListOrganizationUserStatusesUseCase initialized');
  }

  async executeForAdmins(
    command: ListOrganizationUserStatusesCommand & AdminContext,
  ): Promise<ListOrganizationUserStatusesResponse> {
    this.logger.info('Fetching user statuses for organization', {
      organizationId: command.organizationId,
    });

    // Get all users and filter by organization
    const allUsers = await this.userService.listUsers();
    const users = allUsers.filter((user) =>
      user.memberships?.some(
        (membership) => membership.organizationId === command.organizationId,
      ),
    );

    if (users.length === 0) {
      this.logger.info('No users found in organization', {
        organizationId: command.organizationId,
      });
      return { userStatuses: [] };
    }

    // Get all invitations for these users
    const userIds = users.map((user) => user.id);
    const invitations = await this.invitationService.findByUserIds(userIds);

    // Create a map of userId to their latest invitation
    const invitationsByUserId = new Map<string, Invitation>();
    invitations.forEach((invitation) => {
      const existingInvitation = invitationsByUserId.get(
        invitation.userId as string,
      );
      if (
        !existingInvitation ||
        invitation.expirationDate > existingInvitation.expirationDate
      ) {
        invitationsByUserId.set(invitation.userId as string, invitation);
      }
    });

    // Get application URL for building invitation links
    const appUrl = await this.getApplicationUrl();

    // Build user statuses
    const userStatuses: UserStatus[] = users.map((user) => {
      const membership = user.memberships?.find(
        (m) => m.organizationId === command.organizationId,
      );

      const invitation = invitationsByUserId.get(user.id as string);
      const invitationStatus = this.determineInvitationStatus(user, invitation);

      return {
        userId: user.id,
        email: user.email,
        role: membership?.role || 'member',
        isActive: user.active,
        invitationStatus,
        invitationExpirationDate: invitation?.expirationDate,
        invitationLink:
          invitationStatus === 'pending' && invitation
            ? this.buildInvitationUrl(invitation.token, appUrl)
            : undefined,
      };
    });

    this.logger.info('User statuses fetched successfully', {
      organizationId: command.organizationId,
      userCount: userStatuses.length,
    });

    return { userStatuses };
  }

  private determineInvitationStatus(
    user: User,
    invitation: Invitation | undefined,
  ): InvitationStatus {
    // If user is active, they have accepted/completed signup
    if (user.active) {
      return 'accepted';
    }

    // If no invitation exists for inactive user
    if (!invitation) {
      return 'none';
    }

    // Check if invitation is expired
    const now = new Date();
    if (invitation.expirationDate < now) {
      return 'expired';
    }

    // Invitation is still pending
    return 'pending';
  }

  private async getApplicationUrl(): Promise<string> {
    const configValue = await Configuration.getConfig('APP_WEB_URL');
    if (configValue) {
      return removeTrailingSlash(configValue);
    }
    this.logger.warn('Failed to get APP_WEB_URL value, using default', {
      configValue,
      default: ListOrganizationUserStatusesUseCase.DEFAULT_APP_WEB_URL,
    });
    return ListOrganizationUserStatusesUseCase.DEFAULT_APP_WEB_URL;
  }

  private buildInvitationUrl(token: InvitationToken, appUrl: string): string {
    const baseUrl = removeTrailingSlash(appUrl);
    return `${baseUrl}/activate?token=${encodeURIComponent(token)}`;
  }
}
