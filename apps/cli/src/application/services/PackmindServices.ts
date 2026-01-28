import { ListFiles } from './ListFiles';
import { GitService } from './GitService';
import { DiffViolationFilterService } from './DiffViolationFilterService';
import { IExecuteLinterProgramsUseCase } from '@packmind/types';
import { IContentWriterService } from './ContentWriterService';
import { IContentPusherService } from './ContentPusherService';

export interface PackmindServices {
  listFiles: ListFiles;
  gitRemoteUrlService: GitService;
  linterExecutionUseCase: IExecuteLinterProgramsUseCase;
  diffViolationFilterService: DiffViolationFilterService;
  contentWriter: IContentWriterService;
  contentPusher: IContentPusherService;
}
