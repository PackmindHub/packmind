import { PackmindLogger } from '@packmind/logger';
import { PackmindCliHexaFactory } from './PackmindCliHexaFactory';
import {
  GetGitRemoteUrlUseCaseCommand,
  GetGitRemoteUrlUseCaseResult,
} from './application/useCases/GetGitRemoteUrlUseCase';
import {
  ListFilesInDirectoryUseCaseCommand,
  ListFilesInDirectoryUseCaseResult,
} from './application/useCases/ListFilesInDirectoryUseCase';
import {
  LintFilesAgainstRuleCommand,
  LintFilesAgainstRuleResult,
} from './domain/useCases/ILintFilesAgainstRule';
import {
  LintFilesFromConfigCommand,
  LintFilesFromConfigResult,
} from './domain/useCases/ILintFilesFromConfig';
import {
  IInstallPackagesCommand,
  IInstallPackagesResult,
} from './domain/useCases/IInstallPackagesUseCase';
import {
  IInstallCommand,
  IInstallResult,
} from './domain/useCases/IInstallUseCase';
import {
  IInstallDefaultSkillsCommand,
  IInstallDefaultSkillsResult,
} from './domain/useCases/IInstallDefaultSkillsUseCase';
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
  ISetupMcpCommand,
  ISetupMcpResult,
} from './domain/useCases/ISetupMcpUseCase';
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
  INotifyDistributionUseCase,
  PackmindFileConfig,
} from '@packmind/types';
import { logWarningConsole } from './infra/utils/consoleLogger';

import {
  UploadSkillCommand,
  UploadSkillResult,
} from './domain/useCases/IUploadSkillUseCase';
import {
  ArtefactDiff,
  IDiffArtefactsCommand,
  IDiffArtefactsResult,
} from './domain/useCases/IDiffArtefactsUseCase';
import { SubmitDiffsResult } from './domain/useCases/ISubmitDiffsUseCase';
import { CheckDiffsResult } from './domain/useCases/ICheckDiffsUseCase';
import { Space } from '@packmind/types';
import { ISpaceService } from './domain/services/ISpaceService';

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

  public async listFilesInDirectory(
    command: ListFilesInDirectoryUseCaseCommand,
  ): Promise<ListFilesInDirectoryUseCaseResult> {
    return this.hexa.useCases.listFilesInDirectoryUseCase.execute(command);
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

  public async installPackages(
    command: IInstallPackagesCommand,
  ): Promise<IInstallPackagesResult> {
    return this.hexa.useCases.installPackages.execute(command);
  }

  public async install2(command: IInstallCommand): Promise<IInstallResult> {
    return this.hexa.useCases.install2.execute(command);
  }

  public async diffArtefacts(
    command: IDiffArtefactsCommand,
  ): Promise<IDiffArtefactsResult> {
    return this.hexa.useCases.diffArtefacts.execute(command);
  }

  public async submitDiffs(
    groupedDiffs: ArtefactDiff[][],
    message: string,
  ): Promise<SubmitDiffsResult> {
    return this.hexa.useCases.submitDiffs.execute({ groupedDiffs, message });
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

  public async readConfig(baseDirectory: string): Promise<PackmindFileConfig> {
    const config =
      await this.hexa.repositories.configFileRepository.readConfig(
        baseDirectory,
      );
    if (!config) return { packages: {} };

    // Check for non-wildcard versions and warn the user
    const hasNonWildcardVersions = Object.values(config.packages).some(
      (version) => version !== '*',
    );

    if (hasNonWildcardVersions) {
      logWarningConsole(
        'Package versions are not supported yet, getting the latest version',
      );
    }

    return config;
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

  public async writeConfig(
    baseDirectory: string,
    packagesSlugs: string[],
  ): Promise<void> {
    const packages: { [slug: string]: string } = {};
    packagesSlugs.forEach((slug) => {
      packages[slug] = '*';
    });

    // Read existing config to preserve other fields (like agents)
    const existingConfig =
      await this.hexa.repositories.configFileRepository.readConfig(
        baseDirectory,
      );

    await this.hexa.repositories.configFileRepository.writeConfig(
      baseDirectory,
      {
        ...existingConfig,
        packages,
      },
    );
  }

  /**
   * Adds new packages to an existing packmind.json while preserving property order.
   * If the file doesn't exist, creates a new one with default order (packages first).
   *
   * @param baseDirectory - The directory containing packmind.json
   * @param newPackageSlugs - Array of package slugs to add
   */
  public async addPackagesToConfig(
    baseDirectory: string,
    newPackageSlugs: string[],
  ): Promise<void> {
    return this.hexa.repositories.configFileRepository.addPackagesToConfig(
      baseDirectory,
      newPackageSlugs,
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

  public async checkCliVersion(
    command: ICheckCliVersionCommand,
  ): Promise<ICheckCliVersionResult | null> {
    return this.hexa.useCases.checkCliVersion.execute(command);
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

  public notifyDistribution: Gateway<INotifyDistributionUseCase> = async (
    command,
  ) => {
    return this.hexa.repositories.packmindGateway.deployment.notifyDistribution(
      command,
    );
  };

  public async uploadSkill(
    command: UploadSkillCommand,
  ): Promise<UploadSkillResult> {
    return this.hexa.useCases.uploadSkill.execute(command);
  }

  public async installDefaultSkills(
    command: IInstallDefaultSkillsCommand,
  ): Promise<IInstallDefaultSkillsResult> {
    return this.hexa.useCases.installDefaultSkills.execute(command);
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

  /**
   * Normalizes package slugs to the `@space-slug/package-slug` format.
   * Unprefixed slugs are resolved against the organization's default space.
   * Already-prefixed slugs (`@space/pkg`) are returned as-is.
   * Throws if there are multiple spaces and any slug is unprefixed.
   */
  public async normalizePackageSlugs(slugs: string[]): Promise<string[]> {
    if (slugs.length === 0) return [];

    const hasUnprefixed = slugs.some((s) => !s.startsWith('@'));
    if (!hasUnprefixed) return slugs;

    let spaces: Space[];
    try {
      spaces = await this.getSpaces();
    } catch {
      // Older versions of the Packmind app do not support spaces — return slugs as-is.
      logWarningConsole(
        'Your Packmind instance is outdated and needs to be updated. It will not be supported in the v1 release of packmind-cli.',
      );
      return slugs;
    }

    if (spaces.length > 1) {
      throw new Error(
        `Your organization has multiple spaces. Please specify the space for each package using the @space/package format (e.g. @${spaces[0].slug}/my-package).`,
      );
    }

    const defaultSpace = await this.getDefaultSpace();
    return slugs.map((slug) =>
      slug.startsWith('@') ? slug : `@${defaultSpace.slug}/${slug}`,
    );
  }

  public getSpaceService(): ISpaceService {
    return this.hexa.services.spaceService;
  }
}
