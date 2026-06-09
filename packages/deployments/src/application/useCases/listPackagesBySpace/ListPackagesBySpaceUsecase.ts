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

const origin = 'ListPackagesBySpaceUsecase';

export class ListPackagesBySpaceUsecase
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
    this.logger.info('ListPackagesBySpaceUsecase initialized');
  }

  async executeForSpaceMembers(
    command: ListPackagesBySpaceCommand & SpaceMemberContext,
  ): Promise<ListPackagesBySpaceResponse> {
    this.logger.info('Listing packages by space', {
      spaceId: command.spaceId,
      organizationId: command.organizationId,
    });

    try {
      // Verify the space belongs to the organization
      const space = await this.spacesPort.getSpaceById(command.spaceId);
      if (!space) {
        this.logger.warn('Space not found', {
          spaceId: command.spaceId,
        });
        throw new Error(`Space with id ${command.spaceId} not found`);
      }

      if (space.organizationId !== command.organizationId) {
        this.logger.warn('Space does not belong to organization', {
          spaceId: command.spaceId,
          spaceOrganizationId: space.organizationId,
          requestOrganizationId: command.organizationId,
        });
        throw new Error(
          `Space ${command.spaceId} does not belong to organization ${command.organizationId}`,
        );
      }

      // Get packages in the specified space
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
