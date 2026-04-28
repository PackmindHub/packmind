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
  JoinSpaceCommand,
  JoinSpaceResponse,
  SpaceMembersAddedEvent,
  SpaceType,
  UserSpaceRole,
} from '@packmind/types';
import { SpaceNotFoundError } from '@packmind/spaces';
import { SpaceNotJoinableError } from '../../domain/errors/SpaceNotJoinableError';

export class JoinSpaceUseCase extends AbstractMemberUseCase<
  JoinSpaceCommand,
  JoinSpaceResponse
> {
  constructor(
    accountsPort: IAccountsPort,
    private readonly spacesPort: ISpacesPort,
    private readonly eventEmitterService: PackmindEventEmitterService,
  ) {
    super(accountsPort);
  }

  protected async executeForMembers(
    command: JoinSpaceCommand & MemberContext,
  ): Promise<JoinSpaceResponse> {
    const spaceId = createSpaceId(command.spaceId);
    const userId = createUserId(command.userId);
    const organizationId = createOrganizationId(command.organizationId);
    const isOrgAdmin = command.membership.role === 'admin';

    const space = await this.spacesPort.getSpaceById(spaceId);

    if (!space || space.organizationId !== organizationId) {
      throw new SpaceNotFoundError(spaceId);
    }

    if (!isOrgAdmin) {
      if (space.type === SpaceType.private) {
        throw new SpaceNotFoundError(spaceId);
      }

      if (space.type === SpaceType.restricted) {
        throw new SpaceNotJoinableError(spaceId);
      }
    }

    const existingMembership = await this.spacesPort.findMembership(
      userId,
      spaceId,
    );

    if (existingMembership) {
      return {} as JoinSpaceResponse;
    }

    await this.spacesPort.addSpaceMembership({
      userId,
      spaceId,
      role: isOrgAdmin ? UserSpaceRole.ADMIN : UserSpaceRole.MEMBER,
      createdBy: userId,
    });

    this.eventEmitterService.emit(
      new SpaceMembersAddedEvent({
        userId,
        organizationId,
        source: command.source ?? 'ui',
        spaceId,
        memberUserIds: [userId],
      }),
    );

    return {} as JoinSpaceResponse;
  }
}
