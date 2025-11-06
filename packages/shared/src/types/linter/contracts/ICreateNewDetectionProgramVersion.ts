import { IUseCase, PackmindCommand } from '@packmind/types';
import { DetectionStatus } from '../../standards/DetectionStatus';
import {
  DetectionProgram,
  DetectionModeEnum,
  SourceCodeState,
} from '../DetectionProgram';
import { ActiveDetectionProgramId } from '../ActiveDetectionProgram';

export type CreateNewDetectionProgramVersionCommand = PackmindCommand & {
  activeDetectionProgramId: ActiveDetectionProgramId;
  code: string;
  mode?: DetectionModeEnum;
  status?: DetectionStatus;
  updateActiveDetectionProgram?: boolean;
  sourceCodeState?: SourceCodeState;
};

export type ICreateNewDetectionProgramVersion = IUseCase<
  CreateNewDetectionProgramVersionCommand,
  DetectionProgram
>;
