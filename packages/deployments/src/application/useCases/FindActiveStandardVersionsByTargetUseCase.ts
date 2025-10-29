import {
  FindActiveStandardVersionsByTargetCommand,
  IFindActiveStandardVersionsByTargetUseCase,
  PackmindLogger,
} from '@packmind/shared';
import { IStandardsDeploymentRepository } from '../../domain/repositories/IStandardsDeploymentRepository';
import { StandardVersion } from '@packmind/standards/types';

const origin = 'FindActiveStandardVersionsByTargetUseCase';

export class FindActiveStandardVersionsByTargetUseCase
  implements IFindActiveStandardVersionsByTargetUseCase
{
  constructor(
    private readonly standardsDeploymentRepository: IStandardsDeploymentRepository,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: FindActiveStandardVersionsByTargetCommand,
  ): Promise<StandardVersion[]> {
    this.logger.info('Finding active standard versions by target', {
      organizationId: command.organizationId,
      targetId: command.targetId,
    });

    try {
      const standardVersions =
        await this.standardsDeploymentRepository.findActiveStandardVersionsByTarget(
          command.organizationId,
          command.targetId,
        );

      this.logger.info('Successfully found active standard versions', {
        organizationId: command.organizationId,
        targetId: command.targetId,
        count: standardVersions.length,
      });

      return standardVersions;
    } catch (error) {
      this.logger.error('Failed to find active standard versions by target', {
        organizationId: command.organizationId,
        targetId: command.targetId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
