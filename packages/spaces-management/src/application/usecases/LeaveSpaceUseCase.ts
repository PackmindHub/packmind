import {
  AbstractSpaceMemberUseCase,
  PackmindEventEmitterService,
  SpaceMemberContext,
} from '@packmind/node-utils';
import {
  createOrganizationId,
  createUserId,
  IAccountsPort,
  ISpacesPort,
  LeaveSpaceCommand,
  LeaveSpaceResponse,
  SpaceMembersRemovedEvent,
} from '@packmind/types';
import { SpaceNotFoundError } from '@packmind/spaces';
import { CannotLeaveDefaultSpaceError } from '../../domain/errors/CannotLeaveDefaultSpaceError';

export class LeaveSpaceUseCase extends AbstractSpaceMemberUseCase<
  LeaveSpaceCommand,
  LeaveSpaceResponse
> {
  constructor(
    spacesPort: ISpacesPort,
    accountsPort: IAccountsPort,
    private readonly eventEmitterService: PackmindEventEmitterService,
  ) {
    super(spacesPort, accountsPort);
  }

  protected async executeForSpaceMembers(
    command: LeaveSpaceCommand & SpaceMemberContext,
  ): Promise<LeaveSpaceResponse> {
    const { spaceId } = command;
    const userId = createUserId(command.userId);
    const organizationId = createOrganizationId(command.organizationId);

    const space = await this.spacesPort.getSpaceById(spaceId);

    if (!space || space.organizationId !== organizationId) {
      throw new SpaceNotFoundError(spaceId);
    }

    if (space.isDefaultSpace) {
      throw new CannotLeaveDefaultSpaceError(spaceId);
    }

    await this.spacesPort.removeSpaceMembership(userId, spaceId);

    this.eventEmitterService.emit(
      new SpaceMembersRemovedEvent({
        userId,
        organizationId,
        source: command.source ?? 'ui',
        spaceId,
        memberUserIds: [userId],
      }),
    );

    return {} as LeaveSpaceResponse;
  }
}
