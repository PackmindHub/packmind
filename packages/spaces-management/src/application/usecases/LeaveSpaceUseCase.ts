import {
  AbstractMemberUseCase,
  MemberContext,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  createOrganizationId,
  createSpaceId,
  createUserId,
  IAccountsPort,
  ISpacesPort,
  LeaveSpaceCommand,
  LeaveSpaceResponse,
  SpaceMembersRemovedEvent,
} from '@packmind/types';
import { SpaceNotFoundError } from '../../domain/errors/SpaceNotFoundError';
import { CannotLeaveDefaultSpaceError } from '../../domain/errors/CannotLeaveDefaultSpaceError';

export class LeaveSpaceUseCase extends AbstractMemberUseCase<
  LeaveSpaceCommand,
  LeaveSpaceResponse
> {
  constructor(
    accountsPort: IAccountsPort,
    private readonly spacesPort: ISpacesPort,
    private readonly eventEmitterService: PackmindEventEmitterService,
  ) {
    super(accountsPort);
  }

  protected async executeForMembers(
    command: LeaveSpaceCommand & MemberContext,
  ): Promise<LeaveSpaceResponse> {
    const spaceId = createSpaceId(command.spaceId);
    const userId = createUserId(command.userId);
    const organizationId = createOrganizationId(command.organizationId);

    const space = await this.spacesPort.getSpaceById(spaceId);

    if (!space || space.organizationId !== organizationId) {
      throw new SpaceNotFoundError(spaceId);
    }

    if (space.isDefaultSpace) {
      throw new CannotLeaveDefaultSpaceError(spaceId);
    }

    const existingMembership = await this.spacesPort.findMembership(
      userId,
      spaceId,
    );

    if (!existingMembership) {
      return {} as LeaveSpaceResponse;
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
