import { IUseCase, PackmindCommand } from '../../UseCase';
import { DetectionStatus } from '../../standards/DetectionStatus';
import { RuleId } from '../../standards';
import { ProgrammingLanguage } from '../../languages';
import {
  DetectionProgram,
  DetectionModeEnum,
  SourceCodeState,
} from '../DetectionProgram';

export type CreateDetectionProgramCommand = PackmindCommand & {
  ruleId: RuleId;
  code: string;
  language: ProgrammingLanguage;
  mode: DetectionModeEnum;
  status?: DetectionStatus;
  mustBeDraftVersion?: boolean;
  sourceCodeState?: SourceCodeState;
};

export type ICreateDetectionProgram = IUseCase<
  CreateDetectionProgramCommand,
  DetectionProgram
>;
