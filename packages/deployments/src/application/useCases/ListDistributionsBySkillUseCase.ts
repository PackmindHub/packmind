import { PackmindLogger, LogLevel } from '@packmind/logger';
import {
  OrganizationId,
  Distribution,
  IListDistributionsBySkill,
  ListDistributionsBySkillCommand,
} from '@packmind/types';
import { IDistributionRepository } from '../../domain/repositories/IDistributionRepository';

export class ListDistributionsBySkillUseCase implements IListDistributionsBySkill {
  constructor(
    private readonly distributionRepository: IDistributionRepository,
    private readonly logger: PackmindLogger = new PackmindLogger(
      'ListDistributionsBySkillUseCase',
      LogLevel.INFO,
    ),
  ) {
    this.logger.info('ListDistributionsBySkillUseCase initialized');
  }

  /**
   * Lists all distributions for a specific skill in an organization
   * @param command Command containing skillId and organizationId
   * @returns An array of distributions that include the specified skill
   */
  public async execute(
    command: ListDistributionsBySkillCommand,
  ): Promise<Distribution[]> {
    this.logger.info('Listing distributions for skill', {
      skillId: command.skillId,
      organizationId: command.organizationId,
    });

    try {
      const distributions = await this.distributionRepository.listBySkillId(
        command.skillId,
        command.organizationId as OrganizationId,
      );

      this.logger.info('Distributions for skill listed successfully', {
        skillId: command.skillId,
        organizationId: command.organizationId,
        count: distributions.length,
      });

      return distributions;
    } catch (error) {
      this.logger.error('Failed to list distributions for skill', {
        skillId: command.skillId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
