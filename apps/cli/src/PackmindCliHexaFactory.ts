import { PackmindLogger } from '@packmind/shared';
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
import { AstExecutorService } from './application/services/AstExecutorService';

export class PackmindCliHexaFactory {
  public repositories: IPackmindRepositories;
  public services: PackmindServices;

  public useCases: {
    executeSingleFileAst: IExecuteSingleFileAstUseCase;
    getGitRemoteUrl: IGetGitRemoteUrlUseCase;
    listFilesInDirectoryUseCase: IListFilesInDirectoryUseCase;
    lintFilesInDirectory: ILintFilesInDirectory;
  };

  constructor(private readonly logger: PackmindLogger) {
    this.repositories = {
      packmindGateway: new PackmindGateway(
        process.env.PACKMIND_API_KEY_V3 || '',
      ),
    };

    this.services = {
      listFiles: new ListFiles(),
      gitRemoteUrlService: new GitService(),
      astExecutorService: new AstExecutorService(),
    };

    this.useCases = {
      executeSingleFileAst: new ExecuteSingleFileAstUseCase(),
      getGitRemoteUrl: new GetGitRemoteUrlUseCase(),
      listFilesInDirectoryUseCase: new ListFilesInDirectoryUseCase(),
      lintFilesInDirectory: new LintFilesInDirectoryUseCase(
        this.services,
        this.repositories,
      ),
    };
  }
}
