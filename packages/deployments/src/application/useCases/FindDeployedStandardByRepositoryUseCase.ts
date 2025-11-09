import { PackmindLogger } from '@packmind/logger';
import {
  FindDeployedStandardByRepositoryCommand,
  IFindDeployedStandardByRepositoryUseCase,
} from '@packmind/types';
import { IStandardsDeploymentRepository } from '../../domain/repositories/IStandardsDeploymentRepository';
import { StandardVersion } from '@packmind/standards';

const origin = 'FindDeployedStandardByRepositoryUseCase';

export class FindDeployedStandardByRepositoryUseCase
  implements IFindDeployedStandardByRepositoryUseCase
{
  constructor(
    private readonly standardsDeploymentRepository: IStandardsDeploymentRepository,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: FindDeployedStandardByRepositoryCommand,
  ): Promise<StandardVersion[]> {
    this.logger.info('Finding active standard versions by repository', {
      organizationId: command.organizationId,
      gitRepoId: command.gitRepoId,
    });

    try {
      const standardVersions =
        await this.standardsDeploymentRepository.findActiveStandardVersionsByRepository(
          command.organizationId,
          command.gitRepoId,
        );

      this.logger.info('Successfully found active standard versions', {
        organizationId: command.organizationId,
        gitRepoId: command.gitRepoId,
        count: standardVersions.length,
      });

      return standardVersions;
    } catch (error) {
      this.logger.error(
        'Failed to find active standard versions by repository',
        {
          organizationId: command.organizationId,
          gitRepoId: command.gitRepoId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }
}
