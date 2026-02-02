import { IListFiles } from './IListFiles';
import { IExecuteLinterProgramsUseCase } from '@packmind/types';
import { IGitService } from './IGitService';
import { IDiffViolationFilterService } from './IDiffViolationFilterService';

export interface IPackmindServices {
  listFiles: IListFiles;
  gitRemoteUrlService: IGitService;
  linterExecutionUseCase: IExecuteLinterProgramsUseCase;
  diffViolationFilterService: IDiffViolationFilterService;
}
