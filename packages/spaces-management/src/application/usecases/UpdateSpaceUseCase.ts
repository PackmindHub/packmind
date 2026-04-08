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
  SpaceType,
  SpaceVisibilityUpdatedEvent,
  UpdateSpaceCommand,
  UpdateSpaceResponse,
} from '@packmind/types';
import { SpaceNotFoundError } from '../../domain/errors/SpaceNotFoundError';

export class UpdateSpaceUseCase extends AbstractMemberUseCase<
  UpdateSpaceCommand,
  UpdateSpaceResponse
> {
  constructor(
    accountsPort: IAccountsPort,
    private readonly spacesPort: ISpacesPort,
    private readonly eventEmitterService: PackmindEventEmitterService,
  ) {
    super(accountsPort);
  }

  protected async executeForMembers(
    command: UpdateSpaceCommand & MemberContext,
  ): Promise<UpdateSpaceResponse> {
    const spaceId = createSpaceId(command.spaceId);
    const organizationId = createOrganizationId(command.organizationId);

    const space = await this.spacesPort.getSpaceById(spaceId);

    if (!space || space.organizationId !== organizationId) {
      throw new SpaceNotFoundError(spaceId);
    }

    const fields: { name?: string; type?: SpaceType } = {};

    if (command.name !== undefined) {
      fields.name = command.name;
    }

    if (command.type !== undefined) {
      fields.type = command.type;
    }

    if (Object.keys(fields).length === 0) {
      return space;
    }

    const updatedSpace = await this.spacesPort.updateSpace(spaceId, fields);

    if (command.type !== undefined) {
      this.eventEmitterService.emit(
        new SpaceVisibilityUpdatedEvent({
          userId: createUserId(command.userId),
          organizationId,
          source: command.source ?? 'ui',
          spaceId,
          newVisibility: command.type,
        }),
      );
    }

    return updatedSpace;
  }
}
