import {
  CreateSpaceCommand,
  CreateSpaceResponse,
  createUserId,
  ISpacesPort,
  SpaceType,
  UserSpaceRole,
} from '@packmind/types';

export class CreateSpaceUseCase {
  constructor(private readonly spacesPort: ISpacesPort) {}

  async execute(command: CreateSpaceCommand): Promise<CreateSpaceResponse> {
    const space = await this.spacesPort.createSpace({
      ...command,
      type: SpaceType.private,
    });

    await this.spacesPort.addSpaceMembership({
      userId: createUserId(command.userId),
      spaceId: space.id,
      role: UserSpaceRole.ADMIN,
    });

    return space;
  }
}
