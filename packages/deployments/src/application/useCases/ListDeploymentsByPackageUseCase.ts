import { PackmindLogger, LogLevel } from '@packmind/logger';
import {
  OrganizationId,
  Distribution,
  IListDeploymentsByPackage,
  ListDeploymentsByPackageCommand,
} from '@packmind/types';
import { IDistributionRepository } from '../../domain/repositories/IDistributionRepository';

export class ListDeploymentsByPackageUseCase
  implements IListDeploymentsByPackage
{
  constructor(
    private readonly distributionRepository: IDistributionRepository,
    private readonly logger: PackmindLogger = new PackmindLogger(
      'ListDeploymentsByPackageUseCase',
      LogLevel.INFO,
    ),
  ) {
    this.logger.info('ListDeploymentsByPackageUseCase initialized');
  }

  /**
   * Lists all distributions for a specific package in an organization
   * @param command Command containing packageId and organizationId
   * @returns An array of distributions that include the specified package
   */
  public async execute(
    command: ListDeploymentsByPackageCommand,
  ): Promise<Distribution[]> {
    this.logger.info('Listing distributions for package', {
      packageId: command.packageId,
      organizationId: command.organizationId,
    });

    try {
      const distributions = await this.distributionRepository.listByPackageId(
        command.packageId,
        command.organizationId as OrganizationId,
      );

      this.logger.info('Distributions for package listed successfully', {
        packageId: command.packageId,
        organizationId: command.organizationId,
        count: distributions.length,
      });

      return distributions;
    } catch (error) {
      this.logger.error('Failed to list distributions for package', {
        packageId: command.packageId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
