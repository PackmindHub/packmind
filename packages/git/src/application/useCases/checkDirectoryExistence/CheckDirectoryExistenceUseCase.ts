import {
  CheckDirectoryExistenceCommand,
  CheckDirectoryExistenceResult,
  GitRepoNotFoundError,
  ICheckDirectoryExistenceUseCase,
  MissingGitInputError,
} from '@packmind/types';
import { GitRepoService } from '../../GitRepoService';
import { ResolvedGitRepoService } from '../../services/ResolvedGitRepoService';
import { PackmindLogger } from '@packmind/logger';
import { DirectoryExistenceCheckFailedError } from '../../../domain/errors/DirectoryExistenceCheckFailedError';

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

    if (!gitRepoId) {
      throw new MissingGitInputError('Git repository ID');
    }
    if (!directoryPath) {
      throw new MissingGitInputError('Directory path');
    }
    if (!branch) {
      throw new MissingGitInputError('Branch');
    }

    const gitRepo = await this.gitRepoService.findGitRepoById(gitRepoId);
    if (!gitRepo) {
      throw new GitRepoNotFoundError(gitRepoId);
    }

    const gitRepoInstance = await this.resolvedGitRepoService.resolve(gitRepo);

    try {
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

      throw new DirectoryExistenceCheckFailedError(
        gitRepoId,
        directoryPath,
        branch,
        error,
      );
    }
  }
}
