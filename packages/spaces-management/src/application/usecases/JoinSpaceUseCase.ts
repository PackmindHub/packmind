import {
  createOrganizationId,
  createSpaceId,
  createUserId,
  ISpacesPort,
  JoinSpaceCommand,
  JoinSpaceResponse,
  SpaceType,
  UserSpaceRole,
} from '@packmind/types';
import { SpaceNotFoundError } from '../../domain/errors/SpaceNotFoundError';
import { SpaceNotJoinableError } from '../../domain/errors/SpaceNotJoinableError';

export class JoinSpaceUseCase {
  constructor(private readonly spacesPort: ISpacesPort) {}

  async execute(command: JoinSpaceCommand): Promise<JoinSpaceResponse> {
    const spaceId = createSpaceId(command.spaceId);
    const userId = createUserId(command.userId);
    const organizationId = createOrganizationId(command.organizationId);

    const space = await this.spacesPort.getSpaceById(spaceId);

    if (!space || space.organizationId !== organizationId) {
      throw new SpaceNotFoundError(command.spaceId);
    }

    if (space.type === SpaceType.private) {
      throw new SpaceNotFoundError(command.spaceId);
    }

    if (space.type === SpaceType.restricted) {
      throw new SpaceNotJoinableError(command.spaceId);
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
      role: UserSpaceRole.MEMBER,
      createdBy: userId,
    });

    return {} as JoinSpaceResponse;
  }
}
