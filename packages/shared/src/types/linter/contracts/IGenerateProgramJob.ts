import { IUseCase, PackmindCommand } from '../../UseCase';
import { ProgrammingLanguage } from '../../languages/Language';
import { RuleId } from '../../standards/Rule';
import { Rule } from '../../standards/Rule';
import { GenerateProgramOutput } from '../GenerateProgramOutput';
import { DetectionProgramId } from '../DetectionProgram';
import { ActiveDetectionProgramId } from '../ActiveDetectionProgram';

export type GenerateProgramJobCommand = PackmindCommand & {
  value: string;
  rule: Rule;
  ruleId: RuleId;
  jobId: string;
  language: ProgrammingLanguage;
  detectionProgramId: DetectionProgramId;
  activeDetectionProgramId: ActiveDetectionProgramId;
};

export type IGenerateProgramJob = IUseCase<
  GenerateProgramJobCommand,
  GenerateProgramOutput
>;
