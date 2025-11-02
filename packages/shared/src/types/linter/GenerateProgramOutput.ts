import { DetectionStatus } from '../standards/DetectionStatus';
import {
  DetectionProgramId,
  DetectionModeEnum,
  SourceCodeState,
} from './DetectionProgram';
import { ActiveDetectionProgramId } from './ActiveDetectionProgram';

export interface GenerateProgramOutput {
  code: string;
  language: string;
  status: DetectionStatus;
  detectionProgramId: DetectionProgramId;
  mode: DetectionModeEnum;
  sourceCodeState: SourceCodeState;
  activeDetectionProgramId: ActiveDetectionProgramId;
}
