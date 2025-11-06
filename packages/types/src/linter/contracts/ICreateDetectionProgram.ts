import { IUseCase, PackmindCommand } from '../../UseCase';
import { DetectionStatus } from '../../standards/DetectionStatus';
import { RuleId } from '../../standards';
import { ProgrammingLanguage } from '../../languages';
import { DetectionProgram, DetectionModeEnum } from '../DetectionProgram';

export type CreateDetectionProgramCommand = PackmindCommand & {
  ruleId: RuleId;
  code: string;
  language: ProgrammingLanguage;
  mode: DetectionModeEnum;
  status?: DetectionStatus;
  mustBeDraftVersion?: boolean;
};

export type ICreateDetectionProgram = IUseCase<
  CreateDetectionProgramCommand,
  DetectionProgram
>;
