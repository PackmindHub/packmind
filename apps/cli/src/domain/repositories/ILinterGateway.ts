import {
  Gateway,
  IGetActiveDetectionProgramForRule,
  IGetDetectionProgramsForPackagesUseCase,
  IGetDraftDetectionProgramForRule,
} from '@packmind/types';

export interface ILinterGateway {
  getDraftDetectionProgramsForRule: Gateway<IGetDraftDetectionProgramForRule>;
  getActiveDetectionProgramsForRule: Gateway<IGetActiveDetectionProgramForRule>;
  getDetectionProgramsForPackages: Gateway<IGetDetectionProgramsForPackagesUseCase>;
}
