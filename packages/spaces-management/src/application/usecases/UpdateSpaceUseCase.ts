import {
  AbstractMemberUseCase,
  MemberContext,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';
import {
  createOrganizationId,
  createSpaceId,
  createUserId,
  IAccountsPort,
  ISpacesPort,
  isSpaceColor,
  SpaceRenamedEvent,
  SpaceVisibilityUpdatedEvent,
  UpdateSpaceCommand,
  UpdateSpaceResponse,
  UserSpaceRole,
} from '@packmind/types';
import { CannotRenameDefaultSpaceError } from '../../domain/errors/CannotRenameDefaultSpaceError';
import { InvalidSpaceColorError } from '../../domain/errors/InvalidSpaceColorError';
import { SpaceIdentityUpdateForbiddenError } from '../../domain/errors/SpaceIdentityUpdateForbiddenError';
import { SpaceNotFoundError } from '../../domain/errors/SpaceNotFoundError';

export class UpdateSpaceUseCase extends AbstractMemberUseCase<
  UpdateSpaceCommand,
  UpdateSpaceResponse
> {
  constructor(
    private readonly spacesPort: ISpacesPort,
    accountsPort: IAccountsPort,
    private readonly eventEmitterService: PackmindEventEmitterService,
    protected override readonly logger: PackmindLogger = new PackmindLogger(
      'UpdateSpaceUseCase',
    ),
  ) {
    super(accountsPort);
  }

  protected async executeForMembers(
    command: UpdateSpaceCommand & MemberContext,
  ): Promise<UpdateSpaceResponse> {
    const spaceId = createSpaceId(command.spaceId);
    const organizationId = createOrganizationId(command.organizationId);
    const userId = createUserId(command.userId);

    const space = await this.spacesPort.getSpaceById(spaceId);
    if (!space || space.organizationId !== organizationId) {
      throw new SpaceNotFoundError(command.spaceId);
    }

    const isOrgAdmin = command.membership.role === 'admin';
    if (!isOrgAdmin) {
      const spaceMembership = await this.spacesPort.findMembership(
        userId,
        spaceId,
      );
      if (spaceMembership?.role !== UserSpaceRole.ADMIN) {
        throw new SpaceIdentityUpdateForbiddenError(
          command.userId,
          command.spaceId,
        );
      }
    }

    const isRenaming =
      command.name !== undefined && command.name !== space.name;
    if (isRenaming && space.isDefaultSpace) {
      throw new CannotRenameDefaultSpaceError(command.spaceId);
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
