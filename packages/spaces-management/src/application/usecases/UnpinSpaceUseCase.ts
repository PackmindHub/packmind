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
  UnpinSpaceCommand,
  UnpinSpaceResponse,
  SpaceUnpinnedEvent,
} from '@packmind/types';
import { CannotPinDefaultSpaceError } from '../../domain/errors/CannotPinDefaultSpaceError';
import { SpaceMembershipNotFoundError } from '../../domain/errors/SpaceMembershipNotFoundError';
import { SpaceNotFoundError } from '../../domain/errors/SpaceNotFoundError';

export class UnpinSpaceUseCase extends AbstractMemberUseCase<
  UnpinSpaceCommand,
  UnpinSpaceResponse
> {
  constructor(
    accountsPort: IAccountsPort,
    private readonly spacesPort: ISpacesPort,
    private readonly eventEmitterService: PackmindEventEmitterService,
  ) {
    super(accountsPort);
  }

  protected async executeForMembers(
    command: UnpinSpaceCommand & MemberContext,
  ): Promise<UnpinSpaceResponse> {
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
