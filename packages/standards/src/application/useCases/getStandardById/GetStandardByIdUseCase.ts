import { PackmindLogger } from '@packmind/logger';
import {
  AbstractSpaceMemberUseCase,
  SpaceMemberContext,
} from '@packmind/node-utils';
import {
  GetStandardByIdCommand,
  GetStandardByIdResponse,
  IAccountsPort,
  IGetStandardByIdUseCase,
  ISpacesPort,
} from '@packmind/types';
import { StandardSpaceNotAccessibleError } from '../../../domain/errors/StandardSpaceNotAccessibleError';
import { StandardService } from '../../services/StandardService';

const origin = 'GetStandardByIdUseCase';

export class GetStandardByIdUseCase
  extends AbstractSpaceMemberUseCase<
    GetStandardByIdCommand,
    GetStandardByIdResponse
  >
  implements IGetStandardByIdUseCase
{
  constructor(
    spacesPort: ISpacesPort,
    accountsAdapter: IAccountsPort,
    private readonly standardService: StandardService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(spacesPort, accountsAdapter, logger);
    this.logger.info('GetStandardByIdUseCase initialized');
  }

  async executeForSpaceMembers(
    command: GetStandardByIdCommand & SpaceMemberContext,
  ): Promise<GetStandardByIdResponse> {
    this.logger.info('Getting standard by ID', {
      id: command.standardId,
      spaceId: command.spaceId,
    });

    const space = await this.spacesPort.getSpaceById(command.spaceId);
    if (!space || space.organizationId !== command.organizationId) {
      throw new StandardSpaceNotAccessibleError(
        command.spaceId,
        command.organizationId,
      );
    }

    const standard = await this.standardService.getStandardById(
      command.standardId,
    );

    if (!standard || standard.spaceId !== command.spaceId) {
      this.logger.info('Standard not found', { id: command.standardId });
      return { standard: null };
    }

    this.logger.info('Standard retrieved successfully', {
      id: command.standardId,
    });
    return { standard };
  }
}
