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
  PinSpaceCommand,
  PinSpaceResponse,
  SpacePinnedEvent,
} from '@packmind/types';
import { SpaceNotFoundError } from '@packmind/types';
import { CannotPinDefaultSpaceError } from '../../domain/errors/CannotPinDefaultSpaceError';

export class PinSpaceUseCase extends AbstractSpaceMemberUseCase<
  PinSpaceCommand,
  PinSpaceResponse
> {
  constructor(
    spacesPort: ISpacesPort,
    accountsPort: IAccountsPort,
    private readonly eventEmitterService: PackmindEventEmitterService,
  ) {
    super(spacesPort, accountsPort);
  }

  protected async executeForSpaceMembers(
    command: PinSpaceCommand & SpaceMemberContext,
  ): Promise<PinSpaceResponse> {
    const { spaceId } = command;
    const userId = createUserId(command.userId);
    const organizationId = createOrganizationId(command.organizationId);

    const space = await this.spacesPort.getSpaceById(spaceId);
    if (!space) {
      throw new SpaceNotFoundError(spaceId);
    }

    if (space.isDefaultSpace) {
      throw new CannotPinDefaultSpaceError(spaceId);
    }

    await this.spacesPort.updateMembershipPinned(userId, spaceId, true);

    this.eventEmitterService.emit(
      new SpacePinnedEvent({
        userId,
        organizationId,
        source: command.source ?? 'ui',
        spaceId,
      }),
    );

    return {} as PinSpaceResponse;
  }
}
