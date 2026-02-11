import { IExecuteSingleFileAstUseCase } from './domain/useCases/IExecuteSingleFileAstUseCase';
import { IGetGitRemoteUrlUseCase } from './domain/useCases/IGetGitRemoteUrlUseCase';
import { ExecuteSingleFileAstUseCase } from './application/useCases/ExecuteSingleFileAstUseCase';
import { GetGitRemoteUrlUseCase } from './application/useCases/GetGitRemoteUrlUseCase';
import { IListFilesInDirectoryUseCase } from './domain/useCases/IListFilesInDirectoryUseCase';
import { ListFilesInDirectoryUseCase } from './application/useCases/ListFilesInDirectoryUseCase';
import { ILintFilesAgainstRule } from './domain/useCases/ILintFilesAgainstRule';
import { LintFilesAgainstRuleUseCase } from './application/useCases/LintFilesAgainstRuleUseCase';
import { ILintFilesFromConfig } from './domain/useCases/ILintFilesFromConfig';
import { LintFilesFromConfigUseCase } from './application/useCases/LintFilesFromConfigUseCase';
import { PackmindGateway } from './infra/repositories/PackmindGateway';
import { IPackmindServices } from './domain/services/IPackmindServices';
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
import { IListStandardsUseCase } from './domain/useCases/IListStandardsUseCase';
import { ListStandardsUseCase } from './application/useCases/ListStandardsUseCase';
import { IListCommandsUseCase } from './domain/useCases/IListCommandsUseCase';
import { ListCommandsUseCase } from './application/useCases/ListCommandsUseCase';
import { IListSkillsUseCase } from './domain/useCases/IListSkillsUseCase';
import { ListSkillsUseCase } from './application/useCases/ListSkillsUseCase';
import { IUploadSkillUseCase } from './domain/useCases/IUploadSkillUseCase';
import { UploadSkillUseCase } from './application/useCases/UploadSkillUseCase';
import { IDiffArtefactsUseCase } from './domain/useCases/IDiffArtefactsUseCase';
import { DiffArtefactsUseCase } from './application/useCases/DiffArtefactsUseCase';

export class PackmindCliHexaFactory {
  public repositories: IPackmindRepositories;
  public services: IPackmindServices;

  public useCases: {
    executeSingleFileAst: IExecuteSingleFileAstUseCase;
    getGitRemoteUrl: IGetGitRemoteUrlUseCase;
    listFilesInDirectoryUseCase: IListFilesInDirectoryUseCase;
    lintFilesAgainstRule: ILintFilesAgainstRule;
    lintFilesFromConfig: ILintFilesFromConfig;
    installPackages: IInstallPackagesUseCase;
    installDefaultSkills: IInstallDefaultSkillsUseCase;
    listPackages: IListPackagesUseCase;
    getPackageBySlug: IGetPackageSummaryUseCase;
    login: ILoginUseCase;
    logout: ILogoutUseCase;
    whoami: IWhoamiUseCase;
    setupMcp: ISetupMcpUseCase;
    listStandards: IListStandardsUseCase;
    listCommands: IListCommandsUseCase;
    listSkills: IListSkillsUseCase;
    uploadSkill: IUploadSkillUseCase;
    diffArtefacts: IDiffArtefactsUseCase;
  };

  constructor() {
    this.repositories = {
      packmindGateway: new PackmindGateway(loadApiKey()),
      configFileRepository: new ConfigFileRepository(),
    };

    this.services = {
      listFiles: new ListFiles(),
      gitRemoteUrlService: new GitService(),
      linterExecutionUseCase: new ExecuteLinterProgramsUseCase(),
      diffViolationFilterService: new DiffViolationFilterService(),
    };

    this.useCases = {
      executeSingleFileAst: new ExecuteSingleFileAstUseCase(
        this.services.linterExecutionUseCase,
      ),
      getGitRemoteUrl: new GetGitRemoteUrlUseCase(),
      listFilesInDirectoryUseCase: new ListFilesInDirectoryUseCase(),
      lintFilesAgainstRule: new LintFilesAgainstRuleUseCase(
        this.services,
        this.repositories,
      ),
      lintFilesFromConfig: new LintFilesFromConfigUseCase(
        this.services,
        this.repositories,
      ),
      installPackages: new InstallPackagesUseCase(
        this.repositories.packmindGateway,
      ),
      installDefaultSkills: new InstallDefaultSkillsUseCase(this.repositories),
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
      listStandards: new ListStandardsUseCase(
        this.repositories.packmindGateway,
      ),
      listCommands: new ListCommandsUseCase(this.repositories.packmindGateway),
      listSkills: new ListSkillsUseCase(this.repositories.packmindGateway),
      uploadSkill: new UploadSkillUseCase({
        gateway: this.repositories.packmindGateway,
      }),
      diffArtefacts: new DiffArtefactsUseCase(
        this.repositories.packmindGateway,
      ),
    };
  }
}
