import {
  Gateway,
  IGetActiveDetectionProgramForRule,
  IGetDetectionProgramsForPackagesUseCase,
  IGetDraftDetectionProgramForRule,
  IListDetectionProgramUseCase,
} from '@packmind/types';

export interface ILinterGateway {
  listDetectionPrograms: Gateway<IListDetectionProgramUseCase>;
  getDraftDetectionProgramsForRule: Gateway<IGetDraftDetectionProgramForRule>;
  getActiveDetectionProgramsForRule: Gateway<IGetActiveDetectionProgramForRule>;
  getDetectionProgramsForPackages: Gateway<IGetDetectionProgramsForPackagesUseCase>;
}
