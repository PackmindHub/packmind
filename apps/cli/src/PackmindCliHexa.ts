import { PackmindLogger } from '@packmind/logger';
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
import {
  LintFilesLocallyCommand,
  LintFilesLocallyResult,
} from './domain/useCases/ILintFilesLocally';
import {
  IPullDataCommand,
  IPullDataResult,
} from './domain/useCases/IPullDataUseCase';
import {
  IListPackagesCommand,
  IListPackagesResult,
} from './domain/useCases/IListPackagesUseCase';
import {
  IGetPackageSummaryCommand,
  IGetPackageSummaryResult,
} from './domain/useCases/IGetPackageSummaryUseCase';
import { PackmindFileConfig } from '@packmind/types';

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

  public async lintFilesLocally(
    command: LintFilesLocallyCommand,
  ): Promise<LintFilesLocallyResult> {
    return this.hexa.useCases.lintFilesLocally.execute(command);
  }

  public async pullData(command: IPullDataCommand): Promise<IPullDataResult> {
    return this.hexa.useCases.pullData.execute(command);
  }

  public async listPackages(
    command: IListPackagesCommand,
  ): Promise<IListPackagesResult> {
    return this.hexa.useCases.listPackages.execute(command);
  }

  public async getPackageBySlug(
    command: IGetPackageSummaryCommand,
  ): Promise<IGetPackageSummaryResult> {
    return this.hexa.useCases.getPackageBySlug.execute(command);
  }

  public async writeConfig(
    baseDirectory: string,
    packagesSlugs: string[],
  ): Promise<void> {
    const config: PackmindFileConfig = {
      packages: packagesSlugs.reduce(
        (acc, slug) => {
          acc[slug] = '*';
          return acc;
        },
        {} as { [slug: string]: '*' },
      ),
    };
    await this.hexa.repositories.configFileRepository.writeConfig(
      baseDirectory,
      config,
    );
  }

  public async readConfig(baseDirectory: string): Promise<string[]> {
    const config =
      await this.hexa.repositories.configFileRepository.readConfig(
        baseDirectory,
      );
    if (!config) return [];

    // Check for non-wildcard versions and warn the user
    const hasNonWildcardVersions = Object.values(config.packages).some(
      (version) => version !== '*',
    );

    if (hasNonWildcardVersions) {
      console.log(
        'WARN: Package versions are not supported yet, getting the latest version',
      );
    }

    return Object.keys(config.packages);
  }
}
