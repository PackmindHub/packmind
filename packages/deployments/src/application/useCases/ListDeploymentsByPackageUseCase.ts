import { PackmindLogger } from '@packmind/logger';
import {
  AbstractSpaceMemberUseCase,
  SpaceMemberContext,
} from '@packmind/node-utils';
import {
  DistributionHistoryEntry,
  IAccountsPort,
  IListDeploymentsByPackage,
  ISpacesPort,
  ListDeploymentsByPackageCommand,
} from '@packmind/types';
import { IDistributionRepository } from '../../domain/repositories/IDistributionRepository';

const origin = 'ListDeploymentsByPackageUseCase';

export class ListDeploymentsByPackageUseCase
  extends AbstractSpaceMemberUseCase<
    ListDeploymentsByPackageCommand,
    DistributionHistoryEntry[]
  >
  implements IListDeploymentsByPackage
{
  constructor(
    spacesPort: ISpacesPort,
    accountsAdapter: IAccountsPort,
    private readonly distributionRepository: IDistributionRepository,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(spacesPort, accountsAdapter, logger);
    this.logger.info('ListDeploymentsByPackageUseCase initialized');
  }

  /**
   * Lists all distributions for a specific package in a space
   * @param command Command containing packageId, spaceId and organizationId
   * @returns An array of distributions that include the specified package
   */
  async executeForSpaceMembers(
    command: ListDeploymentsByPackageCommand & SpaceMemberContext,
  ): Promise<DistributionHistoryEntry[]> {
    this.logger.info('Listing distributions for package', {
      packageId: command.packageId,
      spaceId: command.spaceId,
      organizationId: command.organizationId,
    });

    try {
      const distributions = await this.distributionRepository.listByPackageId(
        command.packageId,
        command.organizationId,
      );

      this.logger.info('Distributions for package listed successfully', {
        packageId: command.packageId,
        spaceId: command.spaceId,
        organizationId: command.organizationId,
        count: distributions.length,
      });

      return distributions;
    } catch (error) {
      this.logger.error('Failed to list distributions for package', {
        packageId: command.packageId,
        spaceId: command.spaceId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
