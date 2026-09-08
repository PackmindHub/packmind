import { PackmindLogger } from '@packmind/logger';
import { PackmindCliHexaFactory } from './PackmindCliHexaFactory';

import {
  LintFilesAgainstRuleCommand,
  LintFilesAgainstRuleResult,
} from './domain/useCases/ILintFilesAgainstRule';
import {
  LintFilesFromConfigCommand,
  LintFilesFromConfigResult,
} from './domain/useCases/ILintFilesFromConfig';

import {
  IInstallCommand,
  IInstallResult,
} from './domain/useCases/IInstallUseCase';
import {
  IUninstallCommand,
  IUninstallResult,
} from './domain/useCases/IUninstallUseCase';
import {
  IInstallDefaultSkillsCommand,
  IInstallDefaultSkillsResult,
} from './domain/useCases/IInstallDefaultSkillsUseCase';
import {
  EnsureCliVersionOutcome,
  IEnsureCliVersionCommand,
} from './domain/useCases/IEnsureCliVersionUseCase';
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
  ICheckCliVersionCommand,
  ICheckCliVersionResult,
} from './domain/useCases/ICheckCliVersionUseCase';
import {
  ListStandardsCommand,
  ListStandardsResult,
} from './domain/useCases/IListStandardsUseCase';
import {
  ListCommandsCommand,
  ListCommandsResult,
} from './domain/useCases/IListCommandsUseCase';
import {
  IListSkillsCommand,
  IListSkillsResult,
} from './domain/useCases/IListSkillsUseCase';
import {
  AllConfigsResult,
  Gateway,
  HierarchicalConfigResult,
  IGetTrackedRepositoryUseCase,
  INotifyArtefactsDistribution,
  INotifyDistributionUseCase,
  IRenderPackageAsPluginUseCase,
  ITrackPluginDeletedUseCase,
  PackmindFileConfig,
} from '@packmind/types';

import {
  ArtefactDiff,
  IDiffArtefactsCommand,
  IDiffArtefactsResult,
} from './domain/useCases/IDiffArtefactsUseCase';

import { CheckDiffsResult } from './domain/useCases/ICheckDiffsUseCase';
import { Space } from '@packmind/types';
import { ISpaceService } from './domain/services/ISpaceService';
import { IOutput } from './domain/repositories/IOutput';
import {
  TrackRepositoryCommand,
  TrackRepositoryResult,
} from './domain/useCases/trackRepository/ITrackRepositoryUseCase';
import {
  GetTrackingInfoCommand,
  GetTrackingInfoResult,
} from './domain/useCases/trackRepository/IGetTrackingInfoUseCase';

const origin = 'PackmindCliHexa';

export class PackmindCliHexa {
  private readonly hexa: PackmindCliHexaFactory;
  private readonly logger: PackmindLogger;

  constructor(logger: PackmindLogger = new PackmindLogger(origin)) {
    this.logger = logger;

    try {
      // Initialize the hexagon factory
      this.hexa = new PackmindCliHexaFactory();
    } catch (error) {
      this.logger.error('Failed to initialize PackmindCliHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public get output(): IOutput {
    return this.hexa.repositories.output;
  }

  public async lintFilesAgainstRule(
    command: LintFilesAgainstRuleCommand,
  ): Promise<LintFilesAgainstRuleResult> {
    return this.hexa.useCases.lintFilesAgainstRule.execute(command);
  }

  public async lintFilesFromConfig(
    command: LintFilesFromConfigCommand,
  ): Promise<LintFilesFromConfigResult> {
    return this.hexa.useCases.lintFilesFromConfig.execute(command);
  }

  public async install(command: IInstallCommand): Promise<IInstallResult> {
    return this.hexa.useCases.install.execute(command);
  }

  public async uninstall(
    command: IUninstallCommand,
  ): Promise<IUninstallResult> {
    return this.hexa.useCases.uninstall.execute(command);
  }

  public async diffArtefacts(
    command: IDiffArtefactsCommand,
  ): Promise<IDiffArtefactsResult> {
    return this.hexa.useCases.diffArtefacts.execute(command);
  }

  public async checkDiffs(
    groupedDiffs: ArtefactDiff[][],
  ): Promise<CheckDiffsResult> {
    return this.hexa.useCases.checkDiffs.execute({ groupedDiffs });
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

  public async listStandards(
    command: ListStandardsCommand,
  ): Promise<ListStandardsResult> {
    return this.hexa.useCases.listStandards.execute(command);
  }

  public async listCommands(
    command: ListCommandsCommand,
  ): Promise<ListCommandsResult> {
    return this.hexa.useCases.listCommands.execute(command);
  }

  public async listSkills(
    command: IListSkillsCommand,
  ): Promise<IListSkillsResult> {
    return this.hexa.useCases.listSkills.execute(command);
  }

  public async configExists(baseDirectory: string): Promise<boolean> {
    return await this.hexa.repositories.configFileRepository.configExists(
      baseDirectory,
    );
  }

  /**
   * Reads the full packmind.json configuration including agents.
   * Returns null if no config file exists.
   */
  public async readFullConfig(
    baseDirectory: string,
  ): Promise<PackmindFileConfig | null> {
    return this.hexa.repositories.configFileRepository.readConfig(
      baseDirectory,
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

  public async checkCliVersion(
    command: ICheckCliVersionCommand,
  ): Promise<ICheckCliVersionResult | null> {
    return this.hexa.useCases.checkCliVersion.execute(command);
  }

  public getCurrentBranch(repoPath: string): string {
    return this.hexa.services.gitRemoteUrlService.getCurrentBranch(repoPath)
      .branch;
  }

  public isDetachedHead(repoPath: string): boolean {
    return this.hexa.services.gitRemoteUrlService.getCurrentBranch(repoPath)
      .detached;
  }

  public branchExists(repoPath: string, branch: string): boolean {
    return this.hexa.services.gitRemoteUrlService.branchExists(
      repoPath,
      branch,
    );
  }

  public getGitRemoteUrlFromPath(repoPath: string): string {
    return this.hexa.services.gitRemoteUrlService.getGitRemoteUrl(repoPath)
      .gitRemoteUrl;
  }

  public notifyDistribution: Gateway<INotifyDistributionUseCase> = async (
    command,
  ) => {
    return this.hexa.repositories.packmindGateway.deployment.notifyDistribution(
      command,
    );
  };

  public notifyArtefactsDistribution: Gateway<INotifyArtefactsDistribution> =
    async (command) => {
      return this.hexa.repositories.packmindGateway.deployment.notifyArtefactsDistribution(
        command,
      );
    };

  public getTrackedRepository: Gateway<IGetTrackedRepositoryUseCase> = async (
    command,
  ) => {
    return this.hexa.repositories.packmindGateway.repositoryTracking.getTrackedRepository(
      command,
    );
  };

  public renderPlugin: Gateway<IRenderPackageAsPluginUseCase> = async (
    command,
  ) => {
    return this.hexa.repositories.packmindGateway.deployment.renderPlugin(
      command,
    );
  };

  public trackPluginDeleted: Gateway<ITrackPluginDeletedUseCase> = async (
    command,
  ) => {
    return this.hexa.repositories.packmindGateway.deployment.trackPluginDeleted(
      command,
    );
  };

  public async installDefaultSkills(
    command: IInstallDefaultSkillsCommand,
  ): Promise<IInstallDefaultSkillsResult> {
    return this.hexa.useCases.installDefaultSkills.execute(command);
  }

  public async bootstrapSkillsInitDirectory(command: {
    baseDirectory: string;
  }): Promise<void> {
    return this.hexa.useCases.installDefaultSkills.bootstrapEmptyDirectory(
      command.baseDirectory,
    );
  }

  public async ensureCliVersion(
    command: IEnsureCliVersionCommand,
  ): Promise<EnsureCliVersionOutcome> {
    return this.hexa.useCases.ensureCliVersion.execute(command);
  }

  public async trackRepository(
    command: TrackRepositoryCommand,
  ): Promise<TrackRepositoryResult> {
    return this.hexa.useCases.trackRepository.execute(command);
  }

  public async getTrackingInfo(
    command: GetTrackingInfoCommand,
  ): Promise<GetTrackingInfoResult> {
    return this.hexa.useCases.getTrackingInfo.execute(command);
  }

  public getPackmindGateway() {
    return this.hexa.repositories.packmindGateway;
  }

  public async getDefaultSpace(): Promise<Space> {
    return this.hexa.services.spaceService.getDefaultSpace();
  }

  public async getSpaces(): Promise<Space[]> {
    return this.hexa.services.spaceService.getSpaces();
  }

  public getSpaceService(): ISpaceService {
    return this.hexa.services.spaceService;
  }
}
