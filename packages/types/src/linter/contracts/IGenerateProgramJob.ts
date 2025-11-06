import { IUseCase, PackmindCommand } from '../../UseCase';
import { ProgrammingLanguage } from '../../languages';
import { RuleId, Rule } from '../../standards';
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
