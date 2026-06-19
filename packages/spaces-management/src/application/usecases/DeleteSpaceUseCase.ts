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
  DeleteSpaceCommand,
  DeleteSpaceResponse,
  IAccountsPort,
  ISpacesPort,
  SpaceDeletedEvent,
  UserSpaceRole,
} from '@packmind/types';
import { SpaceNotFoundError } from '@packmind/types';
import { CannotDeleteDefaultSpaceError } from '../../domain/errors/CannotDeleteDefaultSpaceError';
import { SpaceDeletionForbiddenError } from '../../domain/errors/SpaceDeletionForbiddenError';

export class DeleteSpaceUseCase extends AbstractMemberUseCase<
  DeleteSpaceCommand,
  DeleteSpaceResponse
> {
  constructor(
    accountsPort: IAccountsPort,
    private readonly spacesPort: ISpacesPort,
    private readonly eventEmitterService: PackmindEventEmitterService,
    protected override readonly logger: PackmindLogger = new PackmindLogger(
      'DeleteSpaceUseCase',
    ),
  ) {
    super(accountsPort);
  }

  protected async executeForMembers(
    command: DeleteSpaceCommand & MemberContext,
  ): Promise<DeleteSpaceResponse> {
    const spaceId = createSpaceId(command.spaceId);
    const organizationId = createOrganizationId(command.organizationId);
    const userId = createUserId(command.userId);

    const space = await this.spacesPort.getSpaceById(spaceId);

    if (!space || space.organizationId !== organizationId) {
      throw new SpaceNotFoundError(spaceId);
    }

    if (space.isDefaultSpace) {
      throw new CannotDeleteDefaultSpaceError(spaceId);
    }

    const isOrgAdmin = command.membership.role === 'admin';

    if (!isOrgAdmin) {
      const spaceMembership = await this.spacesPort.findMembership(
        userId,
        spaceId,
      );

      if (spaceMembership?.role !== UserSpaceRole.ADMIN) {
        throw new SpaceDeletionForbiddenError(command.userId, command.spaceId);
      }
    }

    await this.spacesPort.softDeleteMembershipsBySpaceId(spaceId, userId);
    await this.spacesPort.deleteSpace(spaceId, userId);

    this.eventEmitterService.emit(
      new SpaceDeletedEvent({
        userId,
        organizationId,
        source: command.source ?? 'ui',
        spaceId,
        spaceName: space.name,
        spaceSlug: space.slug,
      }),
    );

    return {} as DeleteSpaceResponse;
  }
}
