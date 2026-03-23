import { PackmindLogger } from '@packmind/logger';
import { AbstractAdminUseCase, AdminContext } from '@packmind/node-utils';
import {
  createOrganizationId,
  CreateSpaceCommand,
  CreateSpaceResponse,
  IAccountsPort,
} from '@packmind/types';
import { SpaceName } from '../../domain/SpaceName';
import { SpaceService } from '../services/SpaceService';

const origin = 'CreateSpaceUseCase';

export class CreateSpaceUseCase extends AbstractAdminUseCase<
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

  protected async executeForAdmins(
    command: CreateSpaceCommand & AdminContext,
  ): Promise<CreateSpaceResponse> {
    const spaceName = new SpaceName(command.name);

    return this.spaceService.createSpace(
      spaceName.value,
      createOrganizationId(command.organizationId),
      false,
    );
  }
}
