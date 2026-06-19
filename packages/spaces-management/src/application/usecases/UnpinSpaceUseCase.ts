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
  UnpinSpaceCommand,
  UnpinSpaceResponse,
  SpaceUnpinnedEvent,
} from '@packmind/types';
import { SpaceNotFoundError } from '@packmind/types';
import { CannotPinDefaultSpaceError } from '../../domain/errors/CannotPinDefaultSpaceError';

export class UnpinSpaceUseCase extends AbstractSpaceMemberUseCase<
  UnpinSpaceCommand,
  UnpinSpaceResponse
> {
  constructor(
    spacesPort: ISpacesPort,
    accountsPort: IAccountsPort,
    private readonly eventEmitterService: PackmindEventEmitterService,
  ) {
    super(spacesPort, accountsPort);
  }

  protected async executeForSpaceMembers(
    command: UnpinSpaceCommand & SpaceMemberContext,
  ): Promise<UnpinSpaceResponse> {
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

    await this.spacesPort.updateMembershipPinned(userId, spaceId, false);

    this.eventEmitterService.emit(
      new SpaceUnpinnedEvent({
        userId,
        organizationId,
        source: command.source ?? 'ui',
        spaceId,
      }),
    );

    return {} as UnpinSpaceResponse;
  }
}
