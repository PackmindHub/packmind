import { ListFiles } from './ListFiles';
import { GitService } from './GitService';
import { DiffViolationFilterService } from './DiffViolationFilterService';
import { IExecuteLinterProgramsUseCase } from '@packmind/types';
import { IContentWriterService } from './ContentWriterService';

export interface PackmindServices {
  listFiles: ListFiles;
  gitRemoteUrlService: GitService;
  linterExecutionUseCase: IExecuteLinterProgramsUseCase;
  diffViolationFilterService: DiffViolationFilterService;
  contentWriter: IContentWriterService;
}
