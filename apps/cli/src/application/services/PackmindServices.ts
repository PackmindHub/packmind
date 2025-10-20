import { ListFiles } from './ListFiles';
import { GitService } from './GitService';
import { IExecuteLinterProgramsUseCase } from '@packmind/shared';

export interface PackmindServices {
  listFiles: ListFiles;
  gitRemoteUrlService: GitService;
  linterExecutionUseCase: IExecuteLinterProgramsUseCase;
}
