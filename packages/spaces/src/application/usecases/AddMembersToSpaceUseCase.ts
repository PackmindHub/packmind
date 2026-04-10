import { PackmindLogger } from '@packmind/logger';
import {
  AbstractSpaceAdminUseCase,
  PackmindEventEmitterService,
  SpaceAdminContext,
} from '@packmind/node-utils';
import {
  AddMembersToSpaceCommand,
  AddMembersToSpaceResponse,
  createOrganizationId,
  createUserId,
  IAccountsPort,
  ISpacesPort,
  SpaceMembersAddedEvent,
  UserSpaceMembership,
} from '@packmind/types';
import { UserSpaceMembershipService } from '../services/UserSpaceMembershipService';

const origin = 'AddMembersToSpaceUseCase';

export class AddMembersToSpaceUseCase extends AbstractSpaceAdminUseCase<
  AddMembersToSpaceCommand,
  AddMembersToSpaceResponse
> {
  constructor(
    spacesPort: ISpacesPort,
    private readonly membershipService: UserSpaceMembershipService,
    accountsPort: IAccountsPort,
    private readonly eventEmitterService: PackmindEventEmitterService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(spacesPort, accountsPort, logger);
  }

  protected async executeForSpaceAdmins(
    command: AddMembersToSpaceCommand & SpaceAdminContext,
  ): Promise<AddMembersToSpaceResponse> {
    const createdMemberships: UserSpaceMembership[] = [];

    for (const member of command.members) {
      try {
        const membership = await this.membershipService.addSpaceMembership({
          userId: member.userId,
          spaceId: command.spaceId,
          role: member.role,
          createdBy: createUserId(command.userId),
        });
        createdMemberships.push(membership);
      } catch (error) {
        this.logger.error('Failed to add member to space', {
          spaceId: command.spaceId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (createdMemberships.length > 0) {
      this.eventEmitterService.emit(
        new SpaceMembersAddedEvent({
          userId: createUserId(command.userId),
          organizationId: createOrganizationId(command.organizationId),
          source: command.source ?? 'ui',
          spaceId: command.spaceId,
          memberUserIds: createdMemberships.map((m) => m.userId),
        }),
      );
    }

    return createdMemberships;
  }
}
