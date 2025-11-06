import {
  Target,
  IGetTargetsByGitRepoUseCase,
  GetTargetsByGitRepoCommand,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { TargetService } from '../services/TargetService';

const origin = 'GetTargetsByGitRepoUseCase';

export class GetTargetsByGitRepoUseCase implements IGetTargetsByGitRepoUseCase {
  constructor(
    private readonly targetService: TargetService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(command: GetTargetsByGitRepoCommand): Promise<Target[]> {
    const { gitRepoId } = command;

    this.logger.info('Getting targets by git repository ID (branch-specific)', {
      gitRepoId,
      organizationId: command.organizationId,
    });

    try {
      const targets = await this.targetService.getTargetsByGitRepoId(gitRepoId);

      this.logger.info('Successfully retrieved targets by git repository ID', {
        gitRepoId,
        organizationId: command.organizationId,
        count: targets.length,
      });

      return targets;
    } catch (error) {
      this.logger.error('Failed to get targets by git repository ID', {
        gitRepoId,
        organizationId: command.organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
