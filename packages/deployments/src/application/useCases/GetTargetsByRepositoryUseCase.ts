import {
  Target,
  IGetTargetsByRepositoryUseCase,
  GetTargetsByRepositoryCommand,
  PackmindLogger,
} from '@packmind/shared';
import { TargetService } from '../services/TargetService';

const origin = 'GetTargetsByRepositoryUseCase';

export class GetTargetsByRepositoryUseCase
  implements IGetTargetsByRepositoryUseCase
{
  constructor(
    private readonly targetService: TargetService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(command: GetTargetsByRepositoryCommand): Promise<Target[]> {
    const { gitRepoId } = command;

    this.logger.info('Getting targets by repository ID', {
      gitRepoId,
      organizationId: command.organizationId,
    });

    try {
      const targets = await this.targetService.getTargetsByGitRepoId(gitRepoId);

      this.logger.info('Successfully retrieved targets by repository ID', {
        gitRepoId,
        organizationId: command.organizationId,
        count: targets.length,
      });

      return targets;
    } catch (error) {
      this.logger.error('Failed to get targets by repository ID', {
        gitRepoId,
        organizationId: command.organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
