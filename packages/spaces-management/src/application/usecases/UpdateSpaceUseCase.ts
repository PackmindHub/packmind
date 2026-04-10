import {
  AbstractSpaceAdminUseCase,
  PackmindEventEmitterService,
  SpaceAdminContext,
} from '@packmind/node-utils';
import {
  createOrganizationId,
  createUserId,
  IAccountsPort,
  ISpacesPort,
  SpaceType,
  SpaceVisibilityUpdatedEvent,
  UpdateSpaceCommand,
  UpdateSpaceResponse,
} from '@packmind/types';
import { CannotUpdateDefaultSpaceVisibilityError } from '../../domain/errors/CannotUpdateDefaultSpaceVisibilityError';
import { SpaceNotFoundError } from '../../domain/errors/SpaceNotFoundError';

export class UpdateSpaceUseCase extends AbstractSpaceAdminUseCase<
  UpdateSpaceCommand,
  UpdateSpaceResponse
> {
  constructor(
    spacesPort: ISpacesPort,
    accountsPort: IAccountsPort,
    private readonly eventEmitterService: PackmindEventEmitterService,
  ) {
    super(spacesPort, accountsPort);
  }

  protected async executeForSpaceAdmins(
    command: UpdateSpaceCommand & SpaceAdminContext,
  ): Promise<UpdateSpaceResponse> {
    const organizationId = createOrganizationId(command.organizationId);

    const space = await this.spacesPort.getSpaceById(command.spaceId);

    if (!space || space.organizationId !== organizationId) {
      throw new SpaceNotFoundError(command.spaceId);
    }

    if (command.type !== undefined && space.isDefaultSpace) {
      throw new CannotUpdateDefaultSpaceVisibilityError(command.spaceId);
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

    const updatedSpace = await this.spacesPort.updateSpace(
      command.spaceId,
      fields,
    );

    if (command.type !== undefined) {
      this.eventEmitterService.emit(
        new SpaceVisibilityUpdatedEvent({
          userId: createUserId(command.userId),
          organizationId,
          source: command.source ?? 'ui',
          spaceId: command.spaceId,
          newVisibility: command.type,
        }),
      );
    }

    return updatedSpace;
  }
}
