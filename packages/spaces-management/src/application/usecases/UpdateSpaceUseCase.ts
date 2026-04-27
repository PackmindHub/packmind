import {
  AbstractSpaceAdminUseCase,
  OrganizationAdminRequiredError,
  PackmindEventEmitterService,
  SpaceAdminContext,
} from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';
import {
  createOrganizationId,
  createUserId,
  IAccountsPort,
  ISpacesPort,
  isSpaceColor,
  SpaceRenamedEvent,
  SpaceType,
  SpaceVisibilityUpdatedEvent,
  UpdateSpaceCommand,
  UpdateSpaceResponse,
} from '@packmind/types';
import { SpaceNotFoundError } from '@packmind/spaces';
import { CannotRenameDefaultSpaceError } from '../../domain/errors/CannotRenameDefaultSpaceError';
import { CannotUpdateDefaultSpaceVisibilityError } from '../../domain/errors/CannotUpdateDefaultSpaceVisibilityError';
import { InvalidSpaceColorError } from '../../domain/errors/InvalidSpaceColorError';

export class UpdateSpaceUseCase extends AbstractSpaceAdminUseCase<
  UpdateSpaceCommand,
  UpdateSpaceResponse
> {
  constructor(
    spacesPort: ISpacesPort,
    accountsPort: IAccountsPort,
    private readonly eventEmitterService: PackmindEventEmitterService,
    logger: PackmindLogger = new PackmindLogger('UpdateSpaceUseCase'),
  ) {
    super(spacesPort, accountsPort, logger);
  }

  protected async executeForSpaceAdmins(
    command: UpdateSpaceCommand & SpaceAdminContext,
  ): Promise<UpdateSpaceResponse> {
    const organizationId = createOrganizationId(command.organizationId);
    const userId = createUserId(command.userId);
    const { spaceId } = command;

    const space = await this.spacesPort.getSpaceById(spaceId);
    if (!space || space.organizationId !== organizationId) {
      throw new SpaceNotFoundError(spaceId);
    }

    const isRenaming =
      command.name !== undefined && command.name !== space.name;
    if (isRenaming && space.isDefaultSpace) {
      throw new CannotRenameDefaultSpaceError(spaceId);
    }

    if (command.type !== undefined && space.isDefaultSpace) {
      throw new CannotUpdateDefaultSpaceVisibilityError(spaceId);
    }

    if (
      command.type !== undefined &&
      command.type !== SpaceType.private &&
      command.membership.role !== 'admin'
    ) {
      throw new OrganizationAdminRequiredError({
        userId: command.userId,
        organizationId: command.organizationId,
      });
    }

    if (command.color !== undefined && !isSpaceColor(command.color)) {
      throw new InvalidSpaceColorError(command.color as string);
    }

    const hasChanges =
      command.name !== undefined ||
      command.type !== undefined ||
      command.color !== undefined;

    if (!hasChanges) {
      return space;
    }

    const updatedSpace = await this.spacesPort.updateSpace(spaceId, {
      name: command.name,
      type: command.type,
      color: command.color,
    });

    if (isRenaming) {
      this.eventEmitterService.emit(
        new SpaceRenamedEvent({
          userId,
          organizationId,
          source: command.source ?? 'ui',
          spaceId,
          spaceSlug: updatedSpace.slug,
          oldName: space.name,
          newName: updatedSpace.name,
        }),
      );
    }

    if (command.type !== undefined && command.type !== space.type) {
      this.eventEmitterService.emit(
        new SpaceVisibilityUpdatedEvent({
          userId,
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
