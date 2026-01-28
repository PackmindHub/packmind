import { PackmindLogger } from '@packmind/logger';
import { IExecuteSingleFileAstUseCase } from './domain/useCases/IExecuteSingleFileAstUseCase';
import { IGetGitRemoteUrlUseCase } from './domain/useCases/IGetGitRemoteUrlUseCase';
import { ExecuteSingleFileAstUseCase } from './application/useCases/ExecuteSingleFileAstUseCase';
import { GetGitRemoteUrlUseCase } from './application/useCases/GetGitRemoteUrlUseCase';
import { IListFilesInDirectoryUseCase } from './domain/useCases/IListFilesInDirectoryUseCase';
import { ListFilesInDirectoryUseCase } from './application/useCases/ListFilesInDirectoryUseCase';
import { ILintFilesInDirectory } from './domain/useCases/ILintFilesInDirectory';
import { LintFilesInDirectoryUseCase } from './application/useCases/LintFilesInDirectoryUseCase';
import { ILintFilesLocally } from './domain/useCases/ILintFilesLocally';
import { LintFilesLocallyUseCase } from './application/useCases/LintFilesLocallyUseCase';
import { PackmindGateway } from './infra/repositories/PackmindGateway';
import { PackmindServices } from './application/services/PackmindServices';
import { IPackmindRepositories } from './domain/repositories/IPackmindRepositories';
import { ListFiles } from './application/services/ListFiles';
import { GitService } from './application/services/GitService';
import { DiffViolationFilterService } from './application/services/DiffViolationFilterService';
import { ExecuteLinterProgramsUseCase } from '@packmind/linter-execution';
import { IInstallPackagesUseCase } from './domain/useCases/IInstallPackagesUseCase';
import { InstallPackagesUseCase } from './application/useCases/InstallPackagesUseCase';
import { IInstallDefaultSkillsUseCase } from './domain/useCases/IInstallDefaultSkillsUseCase';
import { InstallDefaultSkillsUseCase } from './application/useCases/InstallDefaultSkillsUseCase';
import { IListPackagesUseCase } from './domain/useCases/IListPackagesUseCase';
import { ListPackagesUseCase } from './application/useCases/ListPackagesUseCase';
import { IGetPackageSummaryUseCase } from './domain/useCases/IGetPackageSummaryUseCase';
import { GetPackageSummaryUseCase } from './application/useCases/GetPackageSummaryUseCase';
import { ILoginUseCase } from './domain/useCases/ILoginUseCase';
import { LoginUseCase } from './application/useCases/LoginUseCase';
import { ILogoutUseCase } from './domain/useCases/ILogoutUseCase';
import { LogoutUseCase } from './application/useCases/LogoutUseCase';
import { IWhoamiUseCase } from './domain/useCases/IWhoamiUseCase';
import { WhoamiUseCase } from './application/useCases/WhoamiUseCase';
import { ISetupMcpUseCase } from './domain/useCases/ISetupMcpUseCase';
import { SetupMcpUseCase } from './application/useCases/SetupMcpUseCase';
import { McpConfigService } from './application/services/McpConfigService';
import { ConfigFileRepository } from './infra/repositories/ConfigFileRepository';
import { loadApiKey } from './infra/utils/credentialsLoader';
import { IAggressiveOnboardingUseCase } from './domain/useCases/IAggressiveOnboardingUseCase';
import { AggressiveOnboardingUseCase } from './application/useCases/AggressiveOnboardingUseCase';
import { ProjectScannerService } from './application/services/ProjectScannerService';
import { DocumentationScannerService } from './application/services/DocumentationScannerService';
import { StandardsGeneratorService } from './application/services/StandardsGeneratorService';
import { CommandsGeneratorService } from './application/services/CommandsGeneratorService';
import { SkillsGeneratorService } from './application/services/SkillsGeneratorService';
import { SkillsScannerService } from './application/services/SkillsScannerService';
import { ContentPreviewService } from './application/services/ContentPreviewService';
import { ContentWriterService } from './application/services/ContentWriterService';
import { ContentPusherService } from './application/services/ContentPusherService';
import { BaselineItemGeneratorService } from './application/services/BaselineItemGeneratorService';
import { DraftFileWriterService } from './application/services/DraftFileWriterService';
import { OnboardingStateService } from './application/services/OnboardingStateService';
import { RepoFingerprintService } from './application/services/RepoFingerprintService';
import { DraftOnboardingUseCase } from './application/useCases/DraftOnboardingUseCase';
import { IDraftOnboardingUseCase } from './domain/useCases/IDraftOnboardingUseCase';

export class PackmindCliHexaFactory {
  public repositories: IPackmindRepositories;
  public services: PackmindServices;

  public useCases: {
    executeSingleFileAst: IExecuteSingleFileAstUseCase;
    getGitRemoteUrl: IGetGitRemoteUrlUseCase;
    listFilesInDirectoryUseCase: IListFilesInDirectoryUseCase;
    lintFilesInDirectory: ILintFilesInDirectory;
    lintFilesLocally: ILintFilesLocally;
    installPackages: IInstallPackagesUseCase;
    installDefaultSkills: IInstallDefaultSkillsUseCase;
    listPackages: IListPackagesUseCase;
    getPackageBySlug: IGetPackageSummaryUseCase;
    login: ILoginUseCase;
    logout: ILogoutUseCase;
    whoami: IWhoamiUseCase;
    setupMcp: ISetupMcpUseCase;
    aggressiveOnboarding: IAggressiveOnboardingUseCase;
    draftOnboarding: IDraftOnboardingUseCase;
  };

  constructor(private readonly logger: PackmindLogger) {
    this.repositories = {
      packmindGateway: new PackmindGateway(loadApiKey()),
      configFileRepository: new ConfigFileRepository(),
    };

    this.services = {
      listFiles: new ListFiles(),
      gitRemoteUrlService: new GitService(this.logger),
      linterExecutionUseCase: new ExecuteLinterProgramsUseCase(),
      diffViolationFilterService: new DiffViolationFilterService(),
      contentWriter: new ContentWriterService(),
      contentPusher: new ContentPusherService(
        this.repositories.packmindGateway,
      ),
    };

    this.useCases = {
      executeSingleFileAst: new ExecuteSingleFileAstUseCase(
        this.services.linterExecutionUseCase,
      ),
      getGitRemoteUrl: new GetGitRemoteUrlUseCase(),
      listFilesInDirectoryUseCase: new ListFilesInDirectoryUseCase(),
      lintFilesInDirectory: new LintFilesInDirectoryUseCase(
        this.services,
        this.repositories,
        this.logger,
      ),
      lintFilesLocally: new LintFilesLocallyUseCase(
        this.services,
        this.repositories,
        this.logger,
      ),
      installPackages: new InstallPackagesUseCase(
        this.repositories.packmindGateway,
      ),
      installDefaultSkills: new InstallDefaultSkillsUseCase(
        this.repositories.packmindGateway,
      ),
      listPackages: new ListPackagesUseCase(this.repositories.packmindGateway),
      getPackageBySlug: new GetPackageSummaryUseCase(
        this.repositories.packmindGateway,
      ),
      login: new LoginUseCase(),
      logout: new LogoutUseCase(),
      whoami: new WhoamiUseCase(),
      setupMcp: new SetupMcpUseCase({
        gateway: this.repositories.packmindGateway,
        mcpConfigService: new McpConfigService(),
      }),
      aggressiveOnboarding: new AggressiveOnboardingUseCase(
        new ProjectScannerService(),
        new DocumentationScannerService(),
        new StandardsGeneratorService(),
        new CommandsGeneratorService(),
        new SkillsGeneratorService(),
        new SkillsScannerService(),
        new ContentPreviewService(),
      ),
      draftOnboarding: new DraftOnboardingUseCase(
        new ProjectScannerService(),
        new BaselineItemGeneratorService(),
        new DraftFileWriterService(),
        new OnboardingStateService(),
        new RepoFingerprintService(),
        this.repositories.packmindGateway,
        this.logger,
      ),
    };
  }
}
