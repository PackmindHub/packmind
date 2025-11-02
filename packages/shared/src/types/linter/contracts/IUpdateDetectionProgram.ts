import { IUseCase, PackmindCommand } from '../../UseCase';
import { DetectionStatus } from '../../standards/DetectionStatus';
import {
  DetectionProgram,
  DetectionProgramId,
  DetectionModeEnum,
  SourceCodeState,
} from '../DetectionProgram';

export type UpdateDetectionProgramCommand = PackmindCommand & {
  detectionProgramId: DetectionProgramId;
  code: string;
  mode?: DetectionModeEnum;
  status?: DetectionStatus;
  sourceCodeState?: SourceCodeState;
};

export type IUpdateDetectionProgramUseCase = IUseCase<
  UpdateDetectionProgramCommand,
  DetectionProgram
>;
