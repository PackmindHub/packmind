import {
  Gateway,
  IGetActiveDetectionProgramForRule,
  IGetDetectionProgramsForPackagesUseCase,
  IGetDraftDetectionProgramForRule,
  ITrackLinterExecutionUseCase,
} from '@packmind/types';

export interface ILinterGateway {
  getDraftDetectionProgramsForRule: Gateway<IGetDraftDetectionProgramForRule>;
  getActiveDetectionProgramsForRule: Gateway<IGetActiveDetectionProgramForRule>;
  getDetectionProgramsForPackages: Gateway<IGetDetectionProgramsForPackagesUseCase>;
  trackLinterExecution: Gateway<ITrackLinterExecutionUseCase>;
}
