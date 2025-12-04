import { PackmindLogger, LogLevel } from '@packmind/logger';
import {
  OrganizationId,
  Distribution,
  IListDistributionsByStandard,
  ListDistributionsByStandardCommand,
} from '@packmind/types';
import { IDistributionRepository } from '../../domain/repositories/IDistributionRepository';

export class ListDistributionsByStandardUseCase
  implements IListDistributionsByStandard
{
  constructor(
    private readonly distributionRepository: IDistributionRepository,
    private readonly logger: PackmindLogger = new PackmindLogger(
      'ListDistributionsByStandardUseCase',
      LogLevel.INFO,
    ),
  ) {
    this.logger.info('ListDistributionsByStandardUseCase initialized');
  }

  /**
   * Lists all distributions for a specific standard in an organization
   * @param command Command containing standardId and organizationId
   * @returns An array of distributions that include the specified standard
   */
  public async execute(
    command: ListDistributionsByStandardCommand,
  ): Promise<Distribution[]> {
    this.logger.info('Listing distributions for standard', {
      standardId: command.standardId,
      organizationId: command.organizationId,
    });

    try {
      const distributions = await this.distributionRepository.listByStandardId(
        command.standardId,
        command.organizationId as OrganizationId,
      );

      this.logger.info('Distributions for standard listed successfully', {
        standardId: command.standardId,
        organizationId: command.organizationId,
        count: distributions.length,
      });

      return distributions;
    } catch (error) {
      this.logger.error('Failed to list distributions for standard', {
        standardId: command.standardId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
