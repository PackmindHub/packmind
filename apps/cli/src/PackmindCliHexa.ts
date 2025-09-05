import { PackmindLogger } from '@packmind/shared';
import { PackmindCliHexaFactory } from './PackmindCliHexaFactory';
import {
  GetGitRemoteUrlUseCaseCommand,
  GetGitRemoteUrlUseCaseResult,
} from './application/useCases/GetGitRemoteUrlUseCase';
import {
  ExecuteSingleFileAstUseCaseCommand,
  ExecuteSingleFileAstUseCaseResult,
} from './domain/useCases/IExecuteSingleFileAstUseCase';
import {
  ListFilesInDirectoryUseCaseCommand,
  ListFilesInDirectoryUseCaseResult,
} from './application/useCases/ListFilesInDirectoryUseCase';
import {
  LintFilesInDirectoryCommand,
  LintFilesInDirectoryResult,
} from './domain/useCases/ILintFilesInDirectory';

const origin = 'PackmindCliHexa';

export class PackmindCliHexa {
  private readonly hexa: PackmindCliHexaFactory;
  private readonly logger: PackmindLogger;

  constructor(logger: PackmindLogger = new PackmindLogger(origin)) {
    this.logger = logger;

    try {
      // Initialize the hexagon factory
      this.hexa = new PackmindCliHexaFactory(this.logger);
    } catch (error) {
      this.logger.error('Failed to initialize PackmindCliHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Destroys the DeploymentsHexa and cleans up resources
   */
  public destroy(): void {
    this.logger.info('Destroying PackmindCliHexa');
    // Add any cleanup logic here if needed
    this.logger.info('PackmindCliHexa destroyed');
  }

  public async getGitRemoteUrl(
    command: GetGitRemoteUrlUseCaseCommand,
  ): Promise<GetGitRemoteUrlUseCaseResult> {
    return this.hexa.useCases.getGitRemoteUrl.execute(command);
  }

  public async executeSingleFileAst(
    command: ExecuteSingleFileAstUseCaseCommand,
  ): Promise<ExecuteSingleFileAstUseCaseResult> {
    return this.hexa.useCases.executeSingleFileAst.execute(command);
  }

  public async listFilesInDirectory(
    command: ListFilesInDirectoryUseCaseCommand,
  ): Promise<ListFilesInDirectoryUseCaseResult> {
    return this.hexa.useCases.listFilesInDirectoryUseCase.execute(command);
  }

  public async lintFilesInDirectory(
    command: LintFilesInDirectoryCommand,
  ): Promise<LintFilesInDirectoryResult> {
    return this.hexa.useCases.lintFilesInDirectory.execute(command);
  }
}
