import { PackmindLogger } from '@packmind/shared';
import {
  StandardsDeployment,
  createStandardsDeploymentId,
} from '@packmind/shared';
import { v4 as uuidv4 } from 'uuid';
import {
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

      // Convert StandardsDeployment to StandardDeployment
      const standardDeployments: StandardsDeployment[] =
        standardsDeployments.map((standardsDeployment) => ({
          id: createStandardsDeploymentId(uuidv4()), // Generate new ID for StandardDeployment
          standardVersions: standardsDeployment.standardVersions,
          gitRepos: standardsDeployment.gitRepos,
          gitCommits: standardsDeployment.gitCommits,
          createdAt: standardsDeployment.createdAt,
          authorId: standardsDeployment.authorId,
          organizationId: standardsDeployment.organizationId,
        }));

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
