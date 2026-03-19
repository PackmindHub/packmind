import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  createOrganizationId,
  CreateSpaceCommand,
  CreateSpaceResponse,
  IAccountsPort,
} from '@packmind/types';
import { SpaceService } from '../services/SpaceService';

const origin = 'CreateSpaceUseCase';

export class CreateSpaceUseCase extends AbstractMemberUseCase<
  CreateSpaceCommand,
  CreateSpaceResponse
> {
  constructor(
    private readonly spaceService: SpaceService,
    accountsPort: IAccountsPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  protected async executeForMembers(
    command: CreateSpaceCommand & MemberContext,
  ): Promise<CreateSpaceResponse> {
    return this.spaceService.createSpace(
      command.name,
      createOrganizationId(command.organizationId),
      false,
    );
  }
}
