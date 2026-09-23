import { PackmindLogger } from '@packmind/logger';
import {
  AbstractSpaceMemberUseCase,
  SpaceMemberContext,
} from '@packmind/node-utils';
import {
  IAccountsPort,
  IListPackagesBySpaceUseCase,
  ISpacesPort,
  ListPackagesBySpaceCommand,
  ListPackagesBySpaceResponse,
} from '@packmind/types';
import { DeploymentsServices } from '../../services/DeploymentsServices';
import { SpaceNotAccessibleError } from '../../../domain/errors/SpaceNotAccessibleError';

const origin = 'ListPackagesBySpaceUseCase';

export class ListPackagesBySpaceUseCase
  extends AbstractSpaceMemberUseCase<
    ListPackagesBySpaceCommand,
    ListPackagesBySpaceResponse
  >
  implements IListPackagesBySpaceUseCase
{
  constructor(
    spacesPort: ISpacesPort,
    accountsAdapter: IAccountsPort,
    private readonly services: DeploymentsServices,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(spacesPort, accountsAdapter, logger);
    this.logger.info('ListPackagesBySpaceUseCase initialized');
  }

  async executeForSpaceMembers(
    command: ListPackagesBySpaceCommand & SpaceMemberContext,
  ): Promise<ListPackagesBySpaceResponse> {
    this.logger.info('Listing packages by space', {
      spaceId: command.spaceId,
      organizationId: command.organizationId,
    });

    try {
      const space = await this.spacesPort.getSpaceById(command.spaceId);
      if (!space || space.organizationId !== command.organizationId) {
        throw new SpaceNotAccessibleError(
          command.spaceId,
          command.organizationId,
        );
      }

      const packages = await this.services
        .getPackageService()
        .getPackagesBySpaceId(command.spaceId);

      this.logger.info('Packages listed by space successfully', {
        spaceId: command.spaceId,
        organizationId: command.organizationId,
        count: packages.length,
      });

      return { packages };
    } catch (error) {
      this.logger.error('Failed to list packages by space', {
        spaceId: command.spaceId,
        organizationId: command.organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
