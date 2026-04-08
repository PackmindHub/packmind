import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  createOrganizationId,
  createSpaceId,
  IAccountsPort,
  ISpacesPort,
  SpaceType,
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
      throw new SpaceNotFoundError(command.spaceId);
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

    return this.spacesPort.updateSpace(spaceId, fields);
  }
}
