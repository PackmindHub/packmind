import { IUseCase, PackmindCommand } from '../../UseCase';
import {
  ActiveDetectionProgram,
  ActiveDetectionProgramId,
  DetectionSeverity,
} from '../ActiveDetectionProgram';

export type UpdateActiveDetectionProgramSeverityCommand = PackmindCommand & {
  activeDetectionProgramId: ActiveDetectionProgramId;
  severity: DetectionSeverity;
};

export type UpdateActiveDetectionProgramSeverityResponse =
  ActiveDetectionProgram;

export type IUpdateActiveDetectionProgramSeverityUseCase = IUseCase<
  UpdateActiveDetectionProgramSeverityCommand,
  UpdateActiveDetectionProgramSeverityResponse
>;
