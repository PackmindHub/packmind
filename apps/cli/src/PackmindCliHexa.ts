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
  IInstallPackagesCommand,
  IInstallPackagesResult,
} from './domain/useCases/IInstallPackagesUseCase';
import {
  IListPackagesCommand,
  IListPackagesResult,
} from './domain/useCases/IListPackagesUseCase';
import {
  IGetPackageSummaryCommand,
  IGetPackageSummaryResult,
} from './domain/useCases/IGetPackageSummaryUseCase';
import { ILoginCommand, ILoginResult } from './domain/useCases/ILoginUseCase';
import {
  ILogoutCommand,
  ILogoutResult,
} from './domain/useCases/ILogoutUseCase';
import {
  IWhoamiCommand,
  IWhoamiResult,
} from './domain/useCases/IWhoamiUseCase';
import {
  ISetupMcpCommand,
  ISetupMcpResult,
} from './domain/useCases/ISetupMcpUseCase';
import { AllConfigsResult, HierarchicalConfigResult } from '@packmind/types';
import { logWarningConsole } from './infra/utils/consoleLogger';
import {
  NotifyDistributionCommand,
  NotifyDistributionResult,
  UploadSkillCommand,
  UploadSkillResult,
} from './domain/repositories/IPackmindGateway';
import {
  IDeleteLocalSkillCommand,
  IDeleteLocalSkillResult,
} from './domain/useCases/IDeleteLocalSkillUseCase';

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

  public async installPackages(
    command: IInstallPackagesCommand,
  ): Promise<IInstallPackagesResult> {
    return this.hexa.useCases.installPackages.execute(command);
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

  public async configExists(baseDirectory: string): Promise<boolean> {
    return await this.hexa.repositories.configFileRepository.configExists(
      baseDirectory,
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
      logWarningConsole(
        'Package versions are not supported yet, getting the latest version',
      );
    }

    return Object.keys(config.packages);
  }

  public async writeConfig(
    baseDirectory: string,
    packagesSlugs: string[],
  ): Promise<void> {
    const packages: { [slug: string]: string } = {};
    packagesSlugs.forEach((slug) => {
      packages[slug] = '*';
    });

    await this.hexa.repositories.configFileRepository.writeConfig(
      baseDirectory,
      { packages },
    );
  }

  public async readHierarchicalConfig(
    startDirectory: string,
    stopDirectory: string | null,
  ): Promise<HierarchicalConfigResult> {
    return this.hexa.repositories.configFileRepository.readHierarchicalConfig(
      startDirectory,
      stopDirectory,
    );
  }

  public async findDescendantConfigs(directory: string): Promise<string[]> {
    return this.hexa.repositories.configFileRepository.findDescendantConfigs(
      directory,
    );
  }

  public async findAllConfigsInTree(
    startDirectory: string,
    stopDirectory: string | null,
  ): Promise<AllConfigsResult> {
    return this.hexa.repositories.configFileRepository.findAllConfigsInTree(
      startDirectory,
      stopDirectory,
    );
  }

  public async getGitRepositoryRoot(directory: string): Promise<string> {
    return this.hexa.services.gitRemoteUrlService.getGitRepositoryRoot(
      directory,
    );
  }

  public async tryGetGitRepositoryRoot(
    directory: string,
  ): Promise<string | null> {
    return this.hexa.services.gitRemoteUrlService.tryGetGitRepositoryRoot(
      directory,
    );
  }

  public async login(command: ILoginCommand): Promise<ILoginResult> {
    return this.hexa.useCases.login.execute(command);
  }

  public async logout(command: ILogoutCommand): Promise<ILogoutResult> {
    return this.hexa.useCases.logout.execute(command);
  }

  public async whoami(command: IWhoamiCommand): Promise<IWhoamiResult> {
    return this.hexa.useCases.whoami.execute(command);
  }

  public async setupMcp(command: ISetupMcpCommand): Promise<ISetupMcpResult> {
    return this.hexa.useCases.setupMcp.execute(command);
  }

  public getCurrentBranch(repoPath: string): string {
    return this.hexa.services.gitRemoteUrlService.getCurrentBranch(repoPath)
      .branch;
  }

  public getGitRemoteUrlFromPath(repoPath: string): string {
    return this.hexa.services.gitRemoteUrlService.getGitRemoteUrl(repoPath)
      .gitRemoteUrl;
  }

  public async notifyDistribution(
    command: NotifyDistributionCommand,
  ): Promise<NotifyDistributionResult> {
    return this.hexa.repositories.packmindGateway.notifyDistribution(command);
  }

  public async uploadSkill(
    command: UploadSkillCommand,
  ): Promise<UploadSkillResult> {
    return this.hexa.repositories.packmindGateway.uploadSkill(command);
  }

  public async deleteLocalSkill(
    command: IDeleteLocalSkillCommand,
  ): Promise<IDeleteLocalSkillResult> {
    return this.hexa.useCases.deleteLocalSkill.execute(command);
  }
}
