import {
  IListOrganizationUserStatusesUseCase,
  ListOrganizationUserStatusesCommand,
  ListOrganizationUserStatusesResponse,
  UserStatus,
  InvitationStatus,
} from '../../../domain/useCases/IListOrganizationUserStatusesUseCase';
import { PackmindLogger } from '@packmind/shared';
import { DataSource } from 'typeorm';
import { AbstractAdminUseCase } from '../abstractUseCases/AbstractAdminUseCase';
import { User } from '../../../domain/entities/User';
import { Invitation } from '../../../domain/entities/Invitation';
import { IAccountsServices } from '../../IAccountsServices';

const origin = 'ListOrganizationUserStatusesUseCase';

export class ListOrganizationUserStatusesUseCase
  extends AbstractAdminUseCase<
    ListOrganizationUserStatusesCommand,
    ListOrganizationUserStatusesResponse
  >
  implements IListOrganizationUserStatusesUseCase
{
  constructor(
    dataSource: DataSource,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(dataSource, logger);
    logger.info('ListOrganizationUserStatusesUseCase initialized');
  }

  private get services(): IAccountsServices {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this as any).accountsServices;
  }

  async executeForAdmins(
    command: ListOrganizationUserStatusesCommand,
  ): Promise<ListOrganizationUserStatusesResponse> {
    const logger = new PackmindLogger(origin);
    logger.info('Fetching user statuses for organization', {
      organizationId: command.organizationId,
    });

    // Access services from the parent AbstractAdminUseCase
    const userService = this.services.getUserService();
    const invitationService = this.services.getInvitationService();

    // Get all users and filter by organization
    const allUsers = await userService.listUsers();
    const users = allUsers.filter((user) =>
      user.memberships?.some(
        (membership) => membership.organizationId === command.organizationId,
      ),
    );

    if (users.length === 0) {
      logger.info('No users found in organization', {
        organizationId: command.organizationId,
      });
      return { userStatuses: [] };
    }

    // Get all invitations for these users
    const userIds = users.map((user) => user.id);
    const invitations = await invitationService.findByUserIds(userIds);

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
      };
    });

    logger.info('User statuses fetched successfully', {
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
}
