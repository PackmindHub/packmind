import { ListFiles } from './ListFiles';
import { GitService } from './GitService';
import { DiffViolationFilterService } from './DiffViolationFilterService';
import { IExecuteLinterProgramsUseCase } from '@packmind/types';

export interface PackmindServices {
  listFiles: ListFiles;
  gitRemoteUrlService: GitService;
  linterExecutionUseCase: IExecuteLinterProgramsUseCase;
  diffViolationFilterService: DiffViolationFilterService;
}
