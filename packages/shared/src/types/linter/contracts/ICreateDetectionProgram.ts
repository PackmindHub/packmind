import { IUseCase, PackmindCommand } from '@packmind/types';
import { DetectionStatus } from '../../standards/DetectionStatus';
import { RuleId } from '../../standards/Rule';
import { ProgrammingLanguage } from '../../languages/Language';
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
