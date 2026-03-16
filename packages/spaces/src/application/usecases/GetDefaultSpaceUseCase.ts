import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  GetDefaultSpaceCommand,
  GetDefaultSpaceResponse,
  IAccountsPort,
  OrganizationId,
} from '@packmind/types';
import { DefaultSpaceNotFoundError } from '../../domain/errors/DefaultSpaceNotFoundError';
import { SpaceService } from '../services/SpaceService';

const origin = 'GetDefaultSpaceUseCase';

export class GetDefaultSpaceUseCase extends AbstractMemberUseCase<
  GetDefaultSpaceCommand,
  GetDefaultSpaceResponse
> {
  constructor(
    private readonly spaceService: SpaceService,
    accountsPort: IAccountsPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  protected async executeForMembers(
    command: GetDefaultSpaceCommand & MemberContext,
  ): Promise<GetDefaultSpaceResponse> {
    const spaces = await this.spaceService.listSpacesByOrganization(
      command.organizationId as OrganizationId,
    );

    const defaultSpace = spaces.find((space) => space.isDefaultSpace);

    if (!defaultSpace) {
      throw new DefaultSpaceNotFoundError(command.organizationId);
    }

    return { defaultSpace };
  }
}
