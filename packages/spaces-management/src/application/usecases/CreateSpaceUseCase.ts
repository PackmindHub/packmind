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

    const userId = createUserId(command.userId);
    await this.spacesPort.addSpaceMembership({
      userId,
      spaceId: space.id,
      role: UserSpaceRole.ADMIN,
      createdBy: userId,
    });

    return space;
  }
}
