import { PackmindLogger } from '@packmind/logger';
import {
  StandardsDeployment,
  IListDeploymentsByStandard,
  ListDeploymentsByStandardCommand,
} from '@packmind/shared';
import { IStandardsDeploymentRepository } from '../../domain/repositories/IStandardsDeploymentRepository';

const origin = 'ListDeploymentsByStandardUseCase';

export class ListDeploymentsByStandardUseCase
  implements IListDeploymentsByStandard
{
  constructor(
    private readonly standardsDeploymentRepository: IStandardsDeploymentRepository,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: ListDeploymentsByStandardCommand,
  ): Promise<StandardsDeployment[]> {
    this.logger.info('Listing deployments by standard', {
      standardId: command.standardId,
      organizationId: command.organizationId,
    });

    try {
      // Get StandardsDeployment entities from the deployments repository
      const standardsDeployments =
        await this.standardsDeploymentRepository.listByStandardId(
          command.standardId,
          command.organizationId as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        );

      // Return the StandardsDeployment entities directly as they now conform to the type
      const standardDeployments: StandardsDeployment[] = standardsDeployments;

      this.logger.info('Successfully listed deployments by standard', {
        standardId: command.standardId,
        organizationId: command.organizationId,
        count: standardDeployments.length,
      });

      return standardDeployments;
    } catch (error) {
      this.logger.error('Failed to list deployments by standard', {
        standardId: command.standardId,
        organizationId: command.organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
