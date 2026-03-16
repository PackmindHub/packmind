import { IListFiles } from './IListFiles';
import { IExecuteLinterProgramsUseCase } from '@packmind/types';
import { IGitService } from './IGitService';
import { IDiffViolationFilterService } from './IDiffViolationFilterService';
import { ISpaceService } from './ISpaceService';

export interface IPackmindServices {
  listFiles: IListFiles;
  gitRemoteUrlService: IGitService;
  linterExecutionUseCase: IExecuteLinterProgramsUseCase;
  diffViolationFilterService: IDiffViolationFilterService;
  spaceService: ISpaceService;
}
