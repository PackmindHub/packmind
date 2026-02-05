import {
  Gateway,
  IGetActiveDetectionProgramForRule,
  IGetDetectionProgramsForPackagesUseCase,
  IGetDraftDetectionProgramForRule,
} from '@packmind/types';

export type TrackLinterExecutionCommand = {
  targetCount: number;
  standardCount: number;
};

export type TrackLinterExecution = (
  command: TrackLinterExecutionCommand,
) => Promise<void>;

export interface ILinterGateway {
  getDraftDetectionProgramsForRule: Gateway<IGetDraftDetectionProgramForRule>;
  getActiveDetectionProgramsForRule: Gateway<IGetActiveDetectionProgramForRule>;
  getDetectionProgramsForPackages: Gateway<IGetDetectionProgramsForPackagesUseCase>;
  trackLinterExecution: TrackLinterExecution;
}
