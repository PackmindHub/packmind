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
  PinSpaceCommand,
  PinSpaceResponse,
  SpacePinnedEvent,
} from '@packmind/types';
import { SpaceNotFoundError } from '@packmind/spaces';
import { CannotPinDefaultSpaceError } from '../../domain/errors/CannotPinDefaultSpaceError';
import { SpaceMembershipNotFoundError } from '../../domain/errors/SpaceMembershipNotFoundError';

export class PinSpaceUseCase extends AbstractMemberUseCase<
  PinSpaceCommand,
  PinSpaceResponse
> {
  constructor(
    accountsPort: IAccountsPort,
    private readonly spacesPort: ISpacesPort,
    private readonly eventEmitterService: PackmindEventEmitterService,
  ) {
    super(accountsPort);
  }

  protected async executeForMembers(
    command: PinSpaceCommand & MemberContext,
  ): Promise<PinSpaceResponse> {
    const spaceId = createSpaceId(command.spaceId);
    const userId = createUserId(command.userId);
    const organizationId = createOrganizationId(command.organizationId);

    const membership = await this.spacesPort.findMembership(userId, spaceId);
    if (!membership) {
      throw new SpaceMembershipNotFoundError(userId, spaceId);
    }

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
