import { IUseCase, PackmindCommand } from '../../UseCase';
import {
  ActiveDetectionProgram,
  ActiveDetectionProgramId,
  DetectionSeverity,
} from '../ActiveDetectionProgram';
import { RuleId } from '../../standards';

export type UpdateActiveDetectionProgramSeverityCommand = PackmindCommand & {
  activeDetectionProgramId: ActiveDetectionProgramId;
  ruleId: RuleId;
  severity: DetectionSeverity;
};

export type UpdateActiveDetectionProgramSeverityResponse =
  ActiveDetectionProgram;

export type IUpdateActiveDetectionProgramSeverityUseCase = IUseCase<
  UpdateActiveDetectionProgramSeverityCommand,
  UpdateActiveDetectionProgramSeverityResponse
>;
