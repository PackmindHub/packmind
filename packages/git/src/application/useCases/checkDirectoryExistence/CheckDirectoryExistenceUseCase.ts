import {
  CheckDirectoryExistenceCommand,
  CheckDirectoryExistenceResult,
  ICheckDirectoryExistenceUseCase,
} from '@packmind/types';
import { GitRepoService } from '../../GitRepoService';
import { ResolvedGitRepoService } from '../../services/ResolvedGitRepoService';
import { PackmindLogger } from '@packmind/logger';

const origin = 'CheckDirectoryExistenceUseCase';

export class CheckDirectoryExistenceUseCase implements ICheckDirectoryExistenceUseCase {
  constructor(
    private readonly gitRepoService: GitRepoService,
    private readonly resolvedGitRepoService: ResolvedGitRepoService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: CheckDirectoryExistenceCommand,
  ): Promise<CheckDirectoryExistenceResult> {
    const { gitRepoId, directoryPath, branch } = command;

    this.logger.info('Executing checkDirectoryExistence use case', {
      gitRepoId,
      directoryPath,
      branch,
    });

    // Business rule: all required parameters must be provided
    if (!gitRepoId) {
      throw new Error('Git repository ID is required');
    }
    if (!directoryPath) {
      throw new Error('Directory path is required');
    }
    if (!branch) {
      throw new Error('Branch is required');
    }

    // Business rule: git repository must exist
    const gitRepo = await this.gitRepoService.findGitRepoById(gitRepoId);
    if (!gitRepo) {
      throw new Error(`Git repository with ID ${gitRepoId} not found`);
    }

    const gitRepoInstance = await this.resolvedGitRepoService.resolve(gitRepo);

    try {
      // Delegate to repository layer for technical directory existence check
      const exists = await gitRepoInstance.checkDirectoryExists(
        directoryPath,
        branch,
      );

      const result: CheckDirectoryExistenceResult = {
        exists,
        path: directoryPath,
        branch,
      };

      this.logger.info('Directory existence check completed', {
        gitRepoId,
        directoryPath,
        branch,
        exists,
      });

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error('Failed to check directory existence', {
        gitRepoId,
        directoryPath,
        branch,
        error: errorMessage,
      });

      throw new Error(`Failed to check directory existence: ${errorMessage}`);
    }
  }
}
