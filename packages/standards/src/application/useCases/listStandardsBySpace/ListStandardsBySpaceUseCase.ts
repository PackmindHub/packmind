import { PackmindLogger } from '@packmind/logger';
import {
  AbstractSpaceMemberUseCase,
  SpaceMemberContext,
} from '@packmind/node-utils';
import {
  IAccountsPort,
  IListStandardsBySpaceUseCase,
  ISpacesPort,
  ListStandardsBySpaceCommand,
  ListStandardsBySpaceResponse,
} from '@packmind/types';
import { StandardSpaceNotAccessibleError } from '../../../domain/errors/StandardSpaceNotAccessibleError';
import { StandardService } from '../../services/StandardService';

const origin = 'ListStandardsBySpaceUseCase';

export class ListStandardsBySpaceUseCase
  extends AbstractSpaceMemberUseCase<
    ListStandardsBySpaceCommand,
    ListStandardsBySpaceResponse
  >
  implements IListStandardsBySpaceUseCase
{
  constructor(
    spacesPort: ISpacesPort,
    accountsAdapter: IAccountsPort,
    private readonly standardService: StandardService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(spacesPort, accountsAdapter, logger);
    logger.info('ListStandardsBySpaceUseCase initialized');
  }

  async executeForSpaceMembers(
    command: ListStandardsBySpaceCommand & SpaceMemberContext,
  ): Promise<ListStandardsBySpaceResponse> {
    this.logger.info('Listing standards by space', {
      spaceId: command.spaceId,
      organizationId: command.organizationId,
    });

    const space = await this.spacesPort.getSpaceById(command.spaceId);
    if (!space || space.organizationId !== command.organizationId) {
      throw new StandardSpaceNotAccessibleError(
        command.spaceId,
        command.organizationId,
      );
    }

    const standardsInSpace = await this.standardService.listStandardsBySpace(
      command.spaceId,
      { includeDeleted: command.includeDeleted },
    );

    const sortedStandards = standardsInSpace.sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    this.logger.info('Standards listed by space successfully', {
      spaceId: command.spaceId,
      organizationId: command.organizationId,
      count: sortedStandards.length,
    });

    return { standards: sortedStandards };
  }
}
