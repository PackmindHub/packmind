import { PackmindLogger } from '@packmind/logger';
import { IExecuteSingleFileAstUseCase } from './domain/useCases/IExecuteSingleFileAstUseCase';
import { IGetGitRemoteUrlUseCase } from './domain/useCases/IGetGitRemoteUrlUseCase';
import { ExecuteSingleFileAstUseCase } from './application/useCases/ExecuteSingleFileAstUseCase';
import { GetGitRemoteUrlUseCase } from './application/useCases/GetGitRemoteUrlUseCase';
import { IListFilesInDirectoryUseCase } from './domain/useCases/IListFilesInDirectoryUseCase';
import { ListFilesInDirectoryUseCase } from './application/useCases/ListFilesInDirectoryUseCase';
import { ILintFilesInDirectory } from './domain/useCases/ILintFilesInDirectory';
import { LintFilesInDirectoryUseCase } from './application/useCases/LintFilesInDirectoryUseCase';
import { PackmindGateway } from './infra/repositories/PackmindGateway';
import { PackmindServices } from './application/services/PackmindServices';
import { IPackmindRepositories } from './domain/repositories/IPackmindRepositories';
import { ListFiles } from './application/services/ListFiles';
import { GitService } from './application/services/GitService';
import { ExecuteLinterProgramsUseCase } from '@packmind/linter-execution';
import { IPullDataUseCase } from './domain/useCases/IPullDataUseCase';
import { PullDataUseCase } from './application/useCases/PullDataUseCase';
import { IListPackagesUseCase } from './domain/useCases/IListPackagesUseCase';
import { ListPackagesUseCase } from './application/useCases/ListPackagesUseCase';
import { IGetPackageSummaryUseCase } from './domain/useCases/IGetPackageSummaryUseCase';
import { GetPackageSummaryUseCase } from './application/useCases/GetPackageSummaryUseCase';
import { ConfigFileRepository } from './infra/repositories/ConfigFileRepository';

export class PackmindCliHexaFactory {
  public repositories: IPackmindRepositories;
  public services: PackmindServices;

  public useCases: {
    executeSingleFileAst: IExecuteSingleFileAstUseCase;
    getGitRemoteUrl: IGetGitRemoteUrlUseCase;
    listFilesInDirectoryUseCase: IListFilesInDirectoryUseCase;
    lintFilesInDirectory: ILintFilesInDirectory;
    pullData: IPullDataUseCase;
    listPackages: IListPackagesUseCase;
    getPackageBySlug: IGetPackageSummaryUseCase;
  };

  constructor(private readonly logger: PackmindLogger) {
    this.repositories = {
      packmindGateway: new PackmindGateway(
        process.env.PACKMIND_API_KEY_V3 || '',
      ),
      configFileRepository: new ConfigFileRepository(),
    };

    this.services = {
      listFiles: new ListFiles(),
      gitRemoteUrlService: new GitService(this.logger),
      linterExecutionUseCase: new ExecuteLinterProgramsUseCase(),
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
      pullData: new PullDataUseCase(this.repositories.packmindGateway),
      listPackages: new ListPackagesUseCase(this.repositories.packmindGateway),
      getPackageBySlug: new GetPackageSummaryUseCase(
        this.repositories.packmindGateway,
      ),
    };
  }
}
